"""Targeted regression test for real PSTN telephony transliterations and progressive dialogue."""

import pytest
from backend.services.negotiation_policy import classify_control
from backend.contracts.voice import CreditorMandate, InvoiceContext, SessionSnapshot, FinalTranscriptEvent
from backend.services.voice_repository import SqliteVoiceRepository
from backend.services.action_executor import DurableActionExecutor
from backend.services.provider_registry import ProviderRegistry
from backend.services.conversation_controller import ConversationController


def test_pstn_phonetic_transliteration_intents():
    # 1. Audibility issue
    assert classify_control("सॉरी यू आर नॉट ऑडिबल!") == "repeat"
    assert classify_control("you are not audible") == "repeat"
    assert classify_control("awaaz nahi aa rahi") == "repeat"
    assert classify_control("आवाज कट रही है") == "repeat"

    # 2. Rescheduling / busy
    assert classify_control("कैन यू टॉक टू लेटर?") == "busy"
    assert classify_control("can you talk later") == "busy"

    # 3. Dispute / doesn't remember invoice
    assert classify_control("सॉरी आई डॉन'टी रिमेंबर इट!") == "dispute"
    assert classify_control("i don't remember this invoice") == "dispute"
    assert classify_control("mujhe yaad nahi hai invoice") == "dispute"

    # 4. Clarification questions
    assert classify_control("पर क्यों भेजोगे?") == "clarify"
    assert classify_control("क्यों?") == "clarify"
    assert classify_control("kis baat ka invoice hai?") == "clarify"

    # 5. Availability & affirmative
    assert classify_control("एस आई कैन हियर यू?") == "audible"
    assert classify_control("कर सकता हूं") == "available"
    assert classify_control("whatsapp par bhej do") == "delivery_request"


@pytest.mark.asyncio
async def test_progressive_clarification_dialogue():
    repo = SqliteVoiceRepository(":memory:")
    exec_tool = DurableActionExecutor(":memory:")
    registry = ProviderRegistry()
    controller = ConversationController(repo, exec_tool, registry)

    context = InvoiceContext(
        tenant_id="tenant_pstn",
        invoice_id="INV-2026-NISHANT-LIVE",
        contact_id="contact_8840301998",
        invoice_number="INV-2026-NISHANT-LIVE",
        business_name="RevClaim AI",
        contact_name="Nishant Maurya",
        amount_due_minor=4500000,
        currency="INR",
        context_revision="rev_live",
        mandate=CreditorMandate(
            authorized=True,
            version="m_v1",
            allowed_channels=["whatsapp", "email"],
            allow_installments=True,
            minimum_installment_minor=1000000,
            human_target_id="support_rep",
        ),
        verified_channels=["whatsapp", "email"],
    )
    repo.seed_context(context)

    # Create session
    session = await controller.start_session("tenant_pstn", "INV-2026-NISHANT-LIVE", "contact_8840301998", "hi-en", "req_pstn_1")
    assert not session.identity_verified

    # Turn 1: User says "Yes I can hear you" in Devanagari phonetics
    t1 = await controller.handle_turn("tenant_pstn", session.session_id, FinalTranscriptEvent("t1", "एस आई कैन हियर यू?", 0, 1))
    assert t1.state == "INTRODUCING"
    assert "45,000" not in t1.reply

    # Turn 2: User says "सॉरी यू आर नॉट ऑडिबल!"
    t2 = await controller.handle_turn("tenant_pstn", session.session_id, FinalTranscriptEvent("t2", "सॉरी यू आर नॉट ऑडिबल!", 1, 2))
    assert t2.intent == "repeat"
    assert "dheere bolti hoon" in t2.reply.lower() or "clearly" in t2.reply.lower()

    # Turn 3: User asks "क्यों?" (why?)
    t3 = await controller.handle_turn("tenant_pstn", session.session_id, FinalTranscriptEvent("t3", "क्यों?", 2, 3))
    assert t3.intent == "clarify"
    reply_3 = t3.reply

    # Turn 4: User asks again "पर क्यों भेजोगे?" (second clarify)
    t4 = await controller.handle_turn("tenant_pstn", session.session_id, FinalTranscriptEvent("t4", "पर क्यों भेजोगे?", 3, 4))
    assert t4.intent == "clarify"
    reply_4 = t4.reply
    # Repetition is not permission to reveal private invoice details.
    assert "45,000" not in reply_3 + reply_4
import os
import pytest
from dotenv import load_dotenv
from backend.services.provider_registry import OpenAICompatibleIntentProvider

groq_key = os.getenv("GROQ_API_KEY", "").strip()


@pytest.mark.asyncio
async def test_groq_intent_provider_live():
    if not groq_key or os.getenv("VOICE_LIVE_PROVIDER_TESTS") != "1":
        pytest.skip("Explicit opt-in required for live provider test")

    provider = OpenAICompatibleIntentProvider(
        name="groq-test",
        endpoint="https://api.groq.com/openai/v1/chat/completions",
        model="qwen/qwen3.8-27b",
        api_key=groq_key,
    )

    payload = {
        "allowed_intents": ["opt_out", "delivery_request", "payment_proposal", "clarify", "repeat", "busy", "dispute", "affirm"],
        "caller_utterance": "haan whatsapp par payment link bhej do",
    }

    res = await provider.classify(payload, timeout_seconds=2.0)
    assert isinstance(res, dict)
    assert res.get("intent") == "delivery_request"
