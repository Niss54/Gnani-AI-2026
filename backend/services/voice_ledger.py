"""Read invoice facts from Supabase and authorizations from an operator-owned mandate file."""
import json
import os
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from uuid import UUID

import httpx

try:
    from backend.contracts.voice import CreditorMandate, InvoiceContext, VoiceError
    from backend.services.voice_repository import SqliteVoiceRepository
except ImportError:
    from contracts.voice import CreditorMandate, InvoiceContext, VoiceError
    from services.voice_repository import SqliteVoiceRepository


class SupabaseVoiceRepository(SqliteVoiceRepository):
    """Refresh context on every decision. SQLite retains call state and durable suppression."""

    async def _refresh(self, tenant_id, invoice_id):
        try:
            # PostgREST operators are never composed with unrestricted caller input.
            if str(UUID(tenant_id)) != tenant_id or str(UUID(invoice_id)) != invoice_id:
                raise ValueError
        except (TypeError, ValueError):
            raise VoiceError("not_found", "Invoice not found") from None
        base = os.getenv("SUPABASE_URL", "").rstrip("/")
        token = os.getenv("VOICE_LEDGER_READ_TOKEN", "")
        key = os.getenv("SUPABASE_ANON_KEY", "")
        if not base.startswith("https://") or not key or not token:
            raise VoiceError("unavailable", "Invoice ledger reader is not configured")
        fields = ("id,org_id,debtor_id,invoice_number,amount_due,currency,due_date,deliverable_summary,status,updated_at,"
                  "business:organizations(id,name),recipient:debtors(id,org_id,contact_person,phone,email)")
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{base}/rest/v1/invoices", params={
                    "select": fields, "org_id": f"eq.{tenant_id}", "id": f"eq.{invoice_id}"},
                    headers={"apikey": key, "Authorization": f"Bearer {token}"})
                response.raise_for_status()
                rows = json.loads(response.content, parse_float=Decimal)
            if not isinstance(rows, list) or len(rows) != 1:
                raise VoiceError("not_found", "Invoice not found")
            row = rows[0]
            org, contact = row["business"], row["recipient"]
            if (row["org_id"], org["id"], contact["org_id"], row["id"], row["debtor_id"]) != (
                    tenant_id, tenant_id, tenant_id, invoice_id, contact["id"]):
                raise VoiceError("forbidden", "Ledger associations disagree")
            if row["status"] not in {"OVERDUE", "CALLING", "IN_NEGOTIATION", "PTP_AGREED", "PTP_COMMITTED"}:
                raise VoiceError("policy_rejected", "This invoice is not eligible for collection")
            amount = Decimal(str(row["amount_due"])) * 100
            if not amount.is_finite() or amount != amount.to_integral_value() or amount <= 0:
                raise VoiceError("invalid_input", "Invalid ledger amount")
            mandate_path = os.getenv("VOICE_MANDATES_FILE")
            if not mandate_path:
                raise VoiceError("policy_rejected", "Creditor mandate file is not configured")
            entries = json.loads(Path(mandate_path).read_text(encoding="utf-8"))
            grant = entries.get(tenant_id, {}).get(invoice_id)
            if not grant or grant["contact_id"] != contact["id"]:
                raise VoiceError("policy_rejected", "No matching creditor mandate")
            expiry = datetime.fromisoformat(grant["expires_at"].replace("Z", "+00:00"))
            if expiry.tzinfo is None or expiry <= datetime.now(timezone.utc):
                raise VoiceError("policy_rejected", "Creditor mandate has expired")
            mandate = CreditorMandate(**grant["mandate"])
            if not mandate.authorized or not mandate.version:
                raise VoiceError("policy_rejected", "Creditor mandate is inactive")
            # Only destinations explicitly verified by the creditor may leave this service.
            verified = grant.get("verified_destinations", {})
            email = contact["email"] if contact["email"] and contact["email"] == verified.get("email") else None
            phone = contact["phone"] if contact["phone"] and contact["phone"] == verified.get("phone") else None
            context = InvoiceContext(tenant_id, invoice_id, contact["id"], row["invoice_number"],
                                     org["name"], contact["contact_person"], int(amount), row["currency"],
                                     row["updated_at"], mandate, row["deliverable_summary"], row["due_date"],
                                     verified_channels=[name for name, value in (("email", email), ("phone", phone)) if value])
            self.seed_context(context, phone, email)
            return contact["id"]
        except VoiceError:
            raise
        except (httpx.HTTPError, OSError, KeyError, TypeError, ValueError, AttributeError, InvalidOperation):
            raise VoiceError("unavailable", "Could not verify current invoice and creditor mandate") from None

    async def resolve_contact_id(self, tenant_id, invoice_id):
        return await self._refresh(tenant_id, invoice_id)

    async def get_context(self, tenant_id, invoice_id, contact_id):
        await self._refresh(tenant_id, invoice_id)
        return await super().get_context(tenant_id, invoice_id, contact_id)

