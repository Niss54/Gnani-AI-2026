"""Tests for voice contracts, conversation controller, tenant isolation, and invariants."""

import pytest
from datetime import date
from backend.contracts.voice import (
    CreditorMandate,
    FinalTranscriptEvent,
    InvoiceContext,
    VoiceError,
)
from backend.services.action_executor import DurableActionExecutor
from backend.services.conversation_controller import ConversationController
from backend.services.voice_repository import SqliteVoiceRepository


@pytest.fixture
def repo():
    r = SqliteVoiceRepository(":memory:")
    # Seed tenant A
    ctx_a = InvoiceContext(
        tenant_id="tenant_a",
        invoice_id="inv_a_1",
        contact_id="contact_a_1",
        invoice_number="INV-A-001",
        business_name="Acme Design",
        contact_name="Aarav Mehta",
        amount_due_minor=3000000,  # 30,000 INR
        currency="INR",
        context_revision="rev_a",
        mandate=CreditorMandate(
            authorized=True,
            version="m_v1",
            allowed_channels=["email", "whatsapp"],
            allow_installments=True,
            minimum_installment_minor=1000000,
            human_target_id="agent_aarav",
        ),
        verified_channels=["email", "whatsapp"],
    )
    r.seed_context(ctx_a)
    return r


@pytest.fixture
def controller(repo):
    executor = DurableActionExecutor(":memory:")
    return ConversationController(
        repository=repo,
        executor=executor,
        today=lambda: date(2026, 11, 20),
    )


@pytest.mark.asyncio
async def test_session_creation_and_identity_flow(controller, repo):
    # Start session
    session = await controller.start_session(
        tenant_id="tenant_a",
        invoice_id="inv_a_1",
        contact_id="contact_a_1",
        language_mode="en-IN",
        request_id="req_001",
    )
    assert session.session_id is not None
    assert session.state == "INTRODUCING"
    assert session.identity_verified is False
    assert "Acme Design" in session.history[0]["text"]
    assert "Aarav Mehta" in session.history[0]["text"]

    # Affirm identity
    turn1 = await controller.handle_turn(
        "tenant_a",
        session.session_id,
        FinalTranscriptEvent("evt_1", "Yes, this is Aarav speaking", 0, 1),
    )
    assert turn1.intent == "affirm"
    assert turn1.state == "DISCUSSING"
    assert turn1.should_end_call is False

    # Availability confirmation
    turn2 = await controller.handle_turn(
        "tenant_a",
        session.session_id,
        FinalTranscriptEvent("evt_2", "Yes, I am free to talk", 1, 2),
    )
    assert "30,000 rupees" in turn2.reply
    assert "INV-A-001" in turn2.reply


@pytest.mark.asyncio
async def test_tenant_isolation(controller, repo):
    # Start session under tenant A
    session = await controller.start_session(
        tenant_id="tenant_a",
        invoice_id="inv_a_1",
        contact_id="contact_a_1",
        language_mode="en-IN",
        request_id="req_iso_01",
    )

    # Attempting to access or turn with tenant B credentials must be denied
    with pytest.raises(VoiceError) as exc:
        await controller.handle_turn(
            "tenant_b",
            session.session_id,
            FinalTranscriptEvent("evt_b", "Hello", 0, 1),
        )
    assert exc.value.code == "forbidden"


@pytest.mark.asyncio
async def test_concurrency_conflict(controller):
    session = await controller.start_session(
        tenant_id="tenant_a",
        invoice_id="inv_a_1",
        contact_id="contact_a_1",
        language_mode="en-IN",
        request_id="req_conflict_01",
    )

    # Submitting a turn with stale expected_version (e.g. 5 instead of 0) must raise conflict
    with pytest.raises(VoiceError) as exc:
        await controller.handle_turn(
            "tenant_a",
            session.session_id,
            FinalTranscriptEvent("evt_conflict", "Yes", 5, 1),
        )
    assert exc.value.code == "conflict"


@pytest.mark.asyncio
async def test_negation_understanding(controller):
    session = await controller.start_session(
        tenant_id="tenant_a",
        invoice_id="inv_a_1",
        contact_id="contact_a_1",
        language_mode="en-IN",
        request_id="req_neg_01",
    )

    # "not driving" should not trigger safety_close, and "yes" confirms identity
    turn = await controller.handle_turn(
        "tenant_a",
        session.session_id,
        FinalTranscriptEvent("evt_neg1", "Yes, this is Aarav, I am not driving right now", 0, 1),
    )
    assert turn.intent != "safety_close"
    assert turn.should_end_call is False

    # "I will pay tomorrow" must not be parsed as illness
    turn_ptp = await controller.handle_turn(
        "tenant_a",
        session.session_id,
        FinalTranscriptEvent("evt_neg2", "I will pay 30000 on 2026-11-21", 1, 2),
    )
    assert turn_ptp.intent == "payment_proposal"
    assert "2026-11-21" in turn_ptp.reply


@pytest.mark.asyncio
async def test_opt_out_and_compliance(controller):
    session = await controller.start_session(
        tenant_id="tenant_a",
        invoice_id="inv_a_1",
        contact_id="contact_a_1",
        language_mode="en-IN",
        request_id="req_opt_01",
    )

    turn = await controller.handle_turn(
        "tenant_a",
        session.session_id,
        FinalTranscriptEvent("evt_opt", "Do not call me again, remove my number", 0, 1),
    )
    assert turn.intent == "opt_out"
    assert turn.state == "OPTED_OUT"
    assert turn.should_end_call is True
    assert "stopped" in turn.reply.lower()


@pytest.mark.asyncio
async def test_dispute_pause(controller):
    session = await controller.start_session(
        tenant_id="tenant_a",
        invoice_id="inv_a_1",
        contact_id="contact_a_1",
        language_mode="en-IN",
        request_id="req_disp_01",
    )

    turn = await controller.handle_turn(
        "tenant_a",
        session.session_id,
        FinalTranscriptEvent("evt_disp", "I have a dispute, the work was incomplete with bugs", 0, 1),
    )
    assert turn.intent == "dispute"
    assert turn.state == "DISPUTED"
    assert turn.should_end_call is True
    assert "paused" in turn.reply.lower()


@pytest.mark.asyncio
async def test_no_synthetic_banking_hallucinations(controller):
    session = await controller.start_session(
        tenant_id="tenant_a",
        invoice_id="inv_a_1",
        contact_id="contact_a_1",
        language_mode="en-IN",
        request_id="req_bank_01",
    )

    # Inquirer asking for bank details or trust
    turn = await controller.handle_turn(
        "tenant_a",
        session.session_id,
        FinalTranscriptEvent("evt_trust", "Can I trust you, what is your bank account number?", 0, 1),
    )
    # The assistant must NOT fabricate IFSC, account numbers, or fake payment links
    assert "ifsc" not in turn.reply.lower()
    assert "account" not in turn.reply.lower()
    assert "rzp.io" not in turn.reply.lower()
    assert "verify this with your usual contact" in turn.reply.lower()


@pytest.mark.asyncio
async def test_devanagari_and_hinglish_identity_affirmation(controller):
    # Test session in hi-en mode
    session = await controller.start_session(
        tenant_id="tenant_a",
        invoice_id="inv_a_1",
        contact_id="contact_a_1",
        language_mode="hi-en",
        request_id="req_devanagari_01",
    )

    # Caller replies with Devanagari "जी!"
    turn = await controller.handle_turn(
        "tenant_a",
        session.session_id,
        FinalTranscriptEvent("evt_ji", "जी!", 0, 1),
    )
    assert turn.intent == "affirm"
    assert turn.state == "DISCUSSING"
    assert "30,000 rupaye" in turn.reply
    assert "INV-A-001" in turn.reply

    # Test another session with "जी हां!"
    session2 = await controller.start_session(
        tenant_id="tenant_a",
        invoice_id="inv_a_1",
        contact_id="contact_a_1",
        language_mode="hi-en",
        request_id="req_devanagari_02",
    )
    turn2 = await controller.handle_turn(
        "tenant_a",
        session2.session_id,
        FinalTranscriptEvent("evt_ji_haan", "जी हां!", 0, 1),
    )
    assert turn2.intent == "affirm"
    assert turn2.state == "DISCUSSING"
