"""Tests for action executor: idempotency, side effects, and safe creation."""

import pytest
from backend.contracts.voice import CreditorMandate, InvoiceContext, ToolRequest
from backend.services.action_executor import DurableActionExecutor


@pytest.fixture
def mock_context():
    mandate = CreditorMandate(
        authorized=True,
        version="v1.0",
        allowed_channels=["email", "whatsapp"],
        allow_installments=True,
        minimum_installment_minor=1000000,
        human_target_id="support_agent_01",
    )
    return InvoiceContext(
        tenant_id="tenant_alpha",
        invoice_id="inv_101",
        contact_id="contact_101",
        invoice_number="INV-2026-001",
        business_name="Acme Studio",
        contact_name="Rohan Verma",
        amount_due_minor=5000000,
        currency="INR",
        context_revision="rev_1",
        mandate=mandate,
        verified_channels=["email", "whatsapp"],
    )


@pytest.mark.asyncio
async def test_idempotent_execution(mock_context):
    executor = DurableActionExecutor(":memory:")
    req = ToolRequest(
        tool="record_ptp",
        operation_id="op_12345",
        tenant_id="tenant_alpha",
        session_id="sess_101",
        invoice_id="inv_101",
        contact_id="contact_101",
        expected_state_version=1,
        generation=0,
        context_revision="rev_1",
        mandate_version="v1.0",
        arguments={"amount_minor": 5000000, "date": "2026-11-20", "currency": "INR"},
    )

    first_res = await executor.execute(req, mock_context)
    assert first_res.status == "succeeded"
    assert first_res.detail_status == "recorded"
    assert first_res.provider_reference is not None

    # Exact retry with same operation_id must return the stored receipt without re-execution
    second_res = await executor.execute(req, mock_context)
    assert second_res.operation_id == first_res.operation_id
    assert second_res.provider_reference == first_res.provider_reference
    assert second_res.status == "succeeded"


@pytest.mark.asyncio
async def test_ptp_cannot_exceed_balance(mock_context):
    executor = DurableActionExecutor(":memory:")
    req = ToolRequest(
        tool="record_ptp",
        operation_id="op_overflow",
        tenant_id="tenant_alpha",
        session_id="sess_101",
        invoice_id="inv_101",
        contact_id="contact_101",
        expected_state_version=1,
        generation=0,
        context_revision="rev_1",
        mandate_version="v1.0",
        arguments={"amount_minor": 9900000, "date": "2026-11-20", "currency": "INR"},
    )
    res = await executor.execute(req, mock_context)
    assert res.status == "failed"
    assert res.detail_status == "amount_exceeds_balance"


@pytest.mark.asyncio
async def test_send_invoice_does_not_spam(mock_context):
    executor = DurableActionExecutor(":memory:")
    req = ToolRequest(
        tool="send_invoice_or_link",
        operation_id="op_send_clean",
        tenant_id="tenant_alpha",
        session_id="sess_101",
        invoice_id="inv_101",
        contact_id="contact_101",
        expected_state_version=1,
        generation=0,
        context_revision="rev_1",
        mandate_version="v1.0",
        arguments={"channel": "email", "content": "invoice"},
    )
    res = await executor.execute(req, mock_context)
    assert res.status == "succeeded"
    assert res.detail_status == "dispatched"

    # Verify outbox record guarantees no unconsented SMS/Email blast or automatic reminders
    with executor._connection() as conn:
        row = conn.execute("SELECT * FROM outbox_messages WHERE id = ?", (res.data["dispatch_id"],)).fetchone()
        assert row["notify_sms"] == 0
        assert row["notify_email"] == 0
        assert row["reminder_enabled"] == 0
