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
import sqlite3
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
        with self._connection() as conn:
            owner = conn.execute("SELECT tenant_id, session_id, invoice_id, tool_name, arguments_json FROM action_receipts WHERE operation_id = ?", (request.operation_id,)).fetchone()
            if owner and (owner["tenant_id"] != request.tenant_id or owner["session_id"] != request.session_id or owner["invoice_id"] != request.invoice_id or owner["tool_name"] != request.tool or json.loads(owner["arguments_json"]) != request.arguments):
                return ToolResult(request.operation_id, "failed", detail_status="operation_conflict")
        # Check idempotency first
        existing = self._get_receipt(request.operation_id)
        if existing:
            return existing

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
        # A configured target is not evidence that a person answered or accepted.
        return ToolResult(request.operation_id, "failed", detail_status="handoff_adapter_unconfigured")

    async def _tool_send_invoice_or_link(self, request: ToolRequest, context: InvoiceContext) -> ToolResult:
        channel = request.arguments.get("channel")
        if channel not in context.mandate.allowed_channels or channel not in context.verified_channels:
            return ToolResult(request.operation_id, "failed", detail_status="channel_not_authorized")
        return ToolResult(request.operation_id, "failed", detail_status="delivery_adapter_unconfigured")

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
