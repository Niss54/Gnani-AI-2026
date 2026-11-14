"""Durable, idempotent action executor implementing ToolExecutor.

All actions are idempotent via the action_receipts table.
External I/O runs safely:
- Payment link creation sets notify.sms=false, notify.email=false, reminder_enable=false.
- Creation does not send unconsented messages.
- Receipts distinguish succeeded, pending, failed, and unknown states.
"""

from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import re
import httpx
from urllib.parse import urlparse, urlencode
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

try:
    from backend.contracts.voice import (
        InvoiceContext,
        ToolExecutor,
        ToolRequest,
        ToolResult,
        VoiceError,
        require_minor_units,
    )
except ImportError:
    from contracts.voice import (
        InvoiceContext,
        ToolExecutor,
        ToolRequest,
        ToolResult,
        VoiceError,
        require_minor_units,
    )


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class DurableActionExecutor:
    """Local durable actions; external actions fail closed until adapters are configured."""

    def __init__(self, db_path: str | Path = ":memory:") -> None:
        self.db_path = str(db_path)
        self._mem_conn = sqlite3.connect(":memory:", timeout=10.0, check_same_thread=False) if self.db_path == ":memory:" else None
        self._init_receipts_table()

    def _connection(self) -> sqlite3.Connection:
        if self._mem_conn:
            self._mem_conn.row_factory = sqlite3.Row
            return self._mem_conn
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_receipts_table(self) -> None:
        with self._connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS action_receipts (
                    operation_id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    invoice_id TEXT NOT NULL,
                    tool_name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    detail_status TEXT,
                    provider_reference TEXT,
                    arguments_json TEXT NOT NULL,
                    result_data_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS contacts (
                    tenant_id TEXT NOT NULL,
                    contact_id TEXT NOT NULL,
                    name TEXT DEFAULT '',
                    is_blocked INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT '',
                    PRIMARY KEY (tenant_id, contact_id)
                );

                CREATE TABLE IF NOT EXISTS invoices (
                    tenant_id TEXT NOT NULL,
                    invoice_id TEXT NOT NULL,
                    contact_id TEXT DEFAULT '',
                    invoice_number TEXT DEFAULT '',
                    business_name TEXT DEFAULT '',
                    contact_name TEXT DEFAULT '',
                    amount_due_minor INTEGER DEFAULT 0,
                    currency TEXT DEFAULT 'INR',
                    context_revision TEXT DEFAULT '',
                    mandate_json TEXT DEFAULT '{}',
                    payment_status TEXT DEFAULT 'unpaid',
                    created_at TEXT DEFAULT '',
                    updated_at TEXT DEFAULT '',
                    PRIMARY KEY (tenant_id, invoice_id)
                );
            """)

    async def execute(self, request: ToolRequest, context: InvoiceContext) -> ToolResult:
        if (request.tenant_id, request.invoice_id, request.contact_id, request.context_revision, request.mandate_version) != (context.tenant_id, context.invoice_id, context.contact_id, context.context_revision, context.mandate.version) or not context.mandate.authorized:
            return ToolResult(request.operation_id, "failed", detail_status="context_not_authorized")
        if context.mandate.contact_blocked or context.payment_status == "disputed":
            return ToolResult(request.operation_id, "failed", detail_status="contact_suppressed")
        with self._connection() as conn:
            conn.execute("BEGIN IMMEDIATE")
            owner = conn.execute("SELECT * FROM action_receipts WHERE operation_id=?", (request.operation_id,)).fetchone()
            if owner:
                if (owner["tenant_id"], owner["session_id"], owner["invoice_id"], owner["tool_name"],
                    json.loads(owner["arguments_json"])) != (request.tenant_id, request.session_id,
                                                            request.invoice_id, request.tool, request.arguments):
                    return ToolResult(request.operation_id, "failed", detail_status="operation_conflict")
                return ToolResult(request.operation_id, owner["status"], owner["provider_reference"],
                                  owner["detail_status"], json.loads(owner["result_data_json"]))
            conn.execute("""INSERT INTO action_receipts
                (operation_id,tenant_id,session_id,invoice_id,tool_name,status,detail_status,arguments_json,result_data_json,created_at)
                VALUES (?,?,?,?,?,'pending','processing',?,'{}',?)""",
                (request.operation_id, request.tenant_id, request.session_id, request.invoice_id, request.tool,
                 json.dumps(request.arguments), _utc_now()))

        handler = getattr(self, f"_tool_{request.tool}", None)
        if not handler:
            result = ToolResult(
                operation_id=request.operation_id,
                status="failed",
                detail_status="unsupported_tool",
            )
            self._save_receipt(request, result)
            return result

        try:
            result = await handler(request, context)
        except (httpx.TransportError, ValueError):
            result = ToolResult(request.operation_id, "unknown", detail_status="provider_confirmation_missing")
        except Exception as exc:
            result = ToolResult(
                operation_id=request.operation_id,
                status="failed",
                detail_status=f"execution_error:{exc.__class__.__name__}",
            )

        self._save_receipt(request, result)
        return result

    def _get_receipt(self, operation_id: str) -> ToolResult | None:
        with self._connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM action_receipts WHERE operation_id = ?",
                (operation_id,),
            )
            row = cursor.fetchone()
            if not row:
                return None
            return ToolResult(
                operation_id=row["operation_id"],
                status=row["status"],
                provider_reference=row["provider_reference"],
                detail_status=row["detail_status"],
                data=json.loads(row["result_data_json"] or "{}"),
            )

    def _save_receipt(self, request: ToolRequest, result: ToolResult) -> None:
        with self._connection() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO action_receipts (
                    operation_id, tenant_id, session_id, invoice_id, tool_name,
                    status, detail_status, provider_reference, arguments_json,
                    result_data_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    request.operation_id,
                    request.tenant_id,
                    request.session_id,
                    request.invoice_id,
                    request.tool,
                    result.status,
                    result.detail_status,
                    result.provider_reference,
                    json.dumps(request.arguments),
                    json.dumps(result.data),
                    _utc_now(),
                ),
            )

    async def _tool_record_ptp(self, request: ToolRequest, context: InvoiceContext) -> ToolResult:
        args = request.arguments
        amount_minor = args.get("amount_minor")
        plan_date = args.get("date")
        currency = args.get("currency", context.currency)

        if isinstance(amount_minor, bool) or not isinstance(amount_minor, int) or amount_minor <= 0:
            return ToolResult(request.operation_id, "failed", detail_status="invalid_amount")
        if not plan_date or not isinstance(plan_date, str):
            return ToolResult(request.operation_id, "failed", detail_status="invalid_date")
        try:
            if date.fromisoformat(plan_date).isoformat() != plan_date:
                raise ValueError("noncanonical_date")
        except ValueError:
            return ToolResult(request.operation_id, "failed", detail_status="invalid_date")
        if currency != context.currency:
            return ToolResult(request.operation_id, "failed", detail_status="currency_mismatch")
        if context.mandate.latest_due_date and plan_date > context.mandate.latest_due_date:
            return ToolResult(request.operation_id, "failed", detail_status="date_not_authorized")

        # Invariant: PTP amount must not exceed balance
        if amount_minor > context.amount_due_minor:
            return ToolResult(request.operation_id, "failed", detail_status="amount_exceeds_balance")

        # Invariant: Partial PTP requires mandate approval
        if amount_minor < context.amount_due_minor:
            if not context.mandate.allow_installments:
                return ToolResult(request.operation_id, "failed", detail_status="installments_not_authorized")
            if amount_minor < context.mandate.minimum_installment_minor:
                return ToolResult(request.operation_id, "failed", detail_status="below_minimum_installment")

        # Record PTP in DB
        with self._connection() as conn:
            conn.execute(
                """CREATE TABLE IF NOT EXISTS ptp_records (
                    id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    invoice_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    amount_minor INTEGER NOT NULL,
                    currency TEXT NOT NULL,
                    scheduled_date TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );"""
            )
            ptp_id = f"ptp_{hashlib.sha256(request.operation_id.encode()).hexdigest()[:24]}"
            conn.execute(
                """INSERT OR IGNORE INTO ptp_records (id, tenant_id, invoice_id, session_id, amount_minor, currency, scheduled_date, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (ptp_id, request.tenant_id, request.invoice_id, request.session_id, amount_minor, currency, plan_date, _utc_now()),
            )

        provider_ref = f"rec_ptp_{hashlib.sha256(f'{ptp_id}:{amount_minor}:{plan_date}'.encode()).hexdigest()[:16]}"
        return ToolResult(
            operation_id=request.operation_id,
            status="succeeded",
            provider_reference=provider_ref,
            detail_status="recorded",
            data={"ptp_id": ptp_id, "amount_minor": amount_minor, "currency": currency, "scheduled_date": plan_date},
        )

    async def _tool_record_opt_out(self, request: ToolRequest, context: InvoiceContext) -> ToolResult:
        with self._connection() as conn:
            conn.execute(
                """UPDATE contacts SET is_blocked = 1 WHERE tenant_id = ? AND contact_id = ?""",
                (request.tenant_id, request.contact_id),
            )
            conn.execute(
                """CREATE TABLE IF NOT EXISTS suppression_list (
                    tenant_id TEXT NOT NULL,
                    contact_id TEXT NOT NULL,
                    reason TEXT,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (tenant_id, contact_id)
                );"""
            )
            conn.execute(
                """INSERT OR REPLACE INTO suppression_list (tenant_id, contact_id, reason, created_at)
                   VALUES (?, ?, ?, ?)""",
                (request.tenant_id, request.contact_id, request.arguments.get("reason", "opt_out"), _utc_now()),
            )

        ref = f"opt_out_{hashlib.sha256(f'{request.contact_id}:{request.session_id}'.encode()).hexdigest()[:16]}"
        return ToolResult(request.operation_id, "succeeded", provider_reference=ref, detail_status="opted_out")

    async def _tool_record_wrong_number(self, request: ToolRequest, context: InvoiceContext) -> ToolResult:
        with self._connection() as conn:
            conn.execute(
                """UPDATE contacts SET is_blocked = 1 WHERE tenant_id = ? AND contact_id = ?""",
                (request.tenant_id, request.contact_id),
            )
        ref = f"wrong_num_{hashlib.sha256(f'{request.contact_id}'.encode()).hexdigest()[:16]}"
        return ToolResult(request.operation_id, "succeeded", provider_reference=ref, detail_status="flagged_wrong_number")

    async def _tool_pause_for_dispute(self, request: ToolRequest, context: InvoiceContext) -> ToolResult:
        with self._connection() as conn:
            conn.execute(
                """UPDATE invoices SET payment_status = 'disputed', updated_at = ?
                   WHERE tenant_id = ? AND invoice_id = ?""",
                (_utc_now(), request.tenant_id, request.invoice_id),
            )
            conn.execute(
                """CREATE TABLE IF NOT EXISTS disputes (
                    id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    invoice_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    reason TEXT,
                    created_at TEXT NOT NULL
                );"""
            )
            disp_id = f"disp_{hashlib.sha256(request.operation_id.encode()).hexdigest()[:24]}"
            conn.execute(
                """INSERT OR IGNORE INTO disputes (id, tenant_id, invoice_id, session_id, reason, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (disp_id, request.tenant_id, request.invoice_id, request.session_id, request.arguments.get("reason", "dispute"), _utc_now()),
            )
        ref = f"disp_{hashlib.sha256(f'{request.invoice_id}:{request.session_id}'.encode()).hexdigest()[:16]}"
        return ToolResult(request.operation_id, "succeeded", provider_reference=ref, detail_status="paused_dispute")

    async def _tool_request_human_handoff(self, request: ToolRequest, context: InvoiceContext) -> ToolResult:
        target_id = context.mandate.human_target_id
        if os.getenv("VOICE_HUMAN_TRANSFER_ENABLED") != "1" or not target_id:
            return ToolResult(request.operation_id, "failed", detail_status="handoff_adapter_unconfigured")
        targets = json.loads(os.getenv("VOICE_HUMAN_TARGETS", "{}"))
        number = targets.get(context.tenant_id, {}).get(target_id, "")
        if target_id != request.arguments.get("target_id") or not re.fullmatch(r"\+[1-9]\d{7,14}", number):
            return ToolResult(request.operation_id, "failed", detail_status="handoff_target_unverified")
        with self._connection() as conn:
            row = conn.execute("SELECT call_sid FROM voice_sessions WHERE session_id=? AND tenant_id=? AND invoice_id=?",
                               (request.session_id, request.tenant_id, request.invoice_id)).fetchone()
        if not row or not row["call_sid"]:
            return ToolResult(request.operation_id, "failed", detail_status="carrier_call_required")
        return ToolResult(request.operation_id, "pending", detail_status="connecting",
                          data={"dial_number": number, "call_sid": row["call_sid"]})

    async def _tool_send_invoice_or_link(self, request: ToolRequest, context: InvoiceContext) -> ToolResult:
        channel = request.arguments.get("channel")
        if channel not in context.mandate.allowed_channels or channel not in context.verified_channels:
            return ToolResult(request.operation_id, "failed", detail_status="channel_not_authorized")
        key, sender = os.getenv("RESEND_API_KEY"), os.getenv("VOICE_EMAIL_FROM")
        if os.getenv("VOICE_DELIVERY_ENABLED") != "1" or not key or not sender or channel != "email":
            return ToolResult(request.operation_id, "failed", detail_status="delivery_adapter_unconfigured")
        if not context.contact_email or not re.fullmatch(r"[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+", context.contact_email):
            return ToolResult(request.operation_id, "failed", detail_status="recipient_unverified")
        if request.arguments.get("content") != "invoice":
            return ToolResult(request.operation_id, "failed", detail_status="supporting_documents_unavailable")
        total = f"{context.amount_due_minor // 100}.{context.amount_due_minor % 100:02d}"
        payload = {"from": sender, "to": [context.contact_email], "subject": f"Invoice {context.invoice_number}",
                   "text": f"{context.business_name}\nInvoice {context.invoice_number}\n"
                           f"Recorded outstanding balance: {context.currency} {total}\n{context.deliverable}"}
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.post("https://api.resend.com/emails", json=payload,
                headers={"Authorization": f"Bearer {key}", "Idempotency-Key": hashlib.sha256(request.operation_id.encode()).hexdigest()})
        if not response.is_success:
            return self._provider_error(request, response)
        reference = response.json().get("id")
        if not isinstance(reference, str) or not reference.strip():
            return ToolResult(request.operation_id, "unknown", detail_status="provider_confirmation_missing")
        return ToolResult(request.operation_id, "pending", reference, "provider_accepted",
                          {"channel": channel, "content": "invoice_summary"})

    @staticmethod
    def _provider_error(request, response):
        status = "failed" if 400 <= response.status_code < 500 and response.status_code not in (408, 409, 429) else "unknown"
        return ToolResult(request.operation_id, status, detail_status="provider_rejected" if status == "failed" else "provider_confirmation_missing")

    async def _tool_create_payment_link(self, request: ToolRequest, context: InvoiceContext) -> ToolResult:
        key, secret = os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")
        if not key or not secret:
            return ToolResult(request.operation_id, "failed", detail_status="payment_provider_unconfigured")
        discount = request.arguments.get("discount_bps", 0)
        if type(discount) is not int or not 0 <= discount <= context.mandate.maximum_discount_bps:
            return ToolResult(request.operation_id, "failed", detail_status="discount_exceeds_mandate")
        amount = context.amount_due_minor - context.amount_due_minor * discount // 10000
        if amount <= 0 or context.payment_status not in ("partial", "unpaid"):
            return ToolResult(request.operation_id, "failed", detail_status="no_payable_balance")
        reference = hashlib.sha256(request.operation_id.encode()).hexdigest()[:36]
        payload = {"amount": amount, "currency": context.currency, "reference_id": reference,
                   "description": f"Invoice {context.invoice_number}", "notify": {"sms": False, "email": False},
                   "reminder_enable": False, "accept_partial": False}
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.post("https://api.razorpay.com/v1/payment_links", json=payload, auth=(key, secret))
        if not response.is_success:
            return self._provider_error(request, response)
        data = response.json()
        if (not str(data.get("id", "")).startswith("plink_") or data.get("reference_id") != reference
                or data.get("amount") != amount or data.get("currency") != context.currency
                or urlparse(data.get("short_url", "")).scheme != "https"):
            return ToolResult(request.operation_id, "unknown", detail_status="payment_link_unverified")
        return ToolResult(request.operation_id, "succeeded", data["id"], "payment_link_created",
                          {"checkoutUrl": data["short_url"], "amount_minor": amount, "currency": context.currency})

    async def _tool_start_outbound_call(self, request: ToolRequest, context: InvoiceContext) -> ToolResult:
        account, token = os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN")
        origin, sender = os.getenv("VOICE_PUBLIC_BASE_URL", "").rstrip("/"), os.getenv("TWILIO_PHONE_NUMBER", "")
        if not account or not token or not sender or not re.fullmatch(r"https://[a-zA-Z0-9.-]+(?::[0-9]+)?", origin):
            return ToolResult(request.operation_id, "failed", detail_status="carrier_unconfigured")
        if "phone" not in context.verified_channels or not re.fullmatch(r"\+[1-9]\d{7,14}", context.contact_phone or ""):
            return ToolResult(request.operation_id, "failed", detail_status="recipient_unverified")
        callback = f"{origin}/api/twilio/voice?" + urlencode({"sessionId": request.session_id, "tenantId": request.tenant_id})
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.post(f"https://api.twilio.com/2010-04-01/Accounts/{account}/Calls.json",
                data={"From": sender, "To": context.contact_phone, "Url": callback}, auth=(account, token))
        if not response.is_success:
            return self._provider_error(request, response)
        sid = response.json().get("sid", "")
        if not re.fullmatch(r"CA[a-fA-F0-9]{32}", sid):
            return ToolResult(request.operation_id, "unknown", detail_status="carrier_confirmation_missing")
        return ToolResult(request.operation_id, "succeeded", sid, "carrier_accepted", {"callSid": sid})

    async def _tool_record_channel_preference(self, request: ToolRequest, context: InvoiceContext) -> ToolResult:
        channel = request.arguments.get("channel")
        if channel not in {"email", "sms", "whatsapp", "phone"}:
            return ToolResult(request.operation_id, "failed", detail_status="invalid_channel")
        allowed = bool(request.arguments.get("allowed", False))
        with self._connection() as conn:
            conn.execute("CREATE TABLE IF NOT EXISTS contact_channel_preferences (tenant_id TEXT, contact_id TEXT, channel TEXT, allowed INTEGER NOT NULL, PRIMARY KEY(tenant_id, contact_id, channel))")
            conn.execute("INSERT INTO contact_channel_preferences VALUES (?, ?, ?, ?) ON CONFLICT(tenant_id, contact_id, channel) DO UPDATE SET allowed=excluded.allowed", (request.tenant_id, request.contact_id, channel, int(allowed)))
        return ToolResult(request.operation_id, "succeeded", provider_reference=request.operation_id, detail_status="recorded", data={"channel": channel, "allowed": allowed})

    async def _tool_request_payment_review(self, request: ToolRequest, context: InvoiceContext) -> ToolResult:
        with self._connection() as conn:
            conn.execute("CREATE TABLE IF NOT EXISTS payment_reviews (id TEXT PRIMARY KEY, tenant_id TEXT, invoice_id TEXT, client_claim TEXT, status TEXT)")
            conn.execute("INSERT OR IGNORE INTO payment_reviews VALUES (?, ?, ?, ?, 'pending')", (request.operation_id, request.tenant_id, request.invoice_id, request.arguments.get("client_claim", "already_paid")))
        return ToolResult(request.operation_id, "succeeded", provider_reference=request.operation_id, detail_status="review_pending")
