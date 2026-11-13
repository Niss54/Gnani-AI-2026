"""Regression cases from the listener, privacy, auth and honest-evidence audit."""
import json
from dataclasses import replace

import pytest
from fastapi import HTTPException

from backend.contracts.voice import CreditorMandate, InvoiceContext, FinalTranscriptEvent, ToolRequest
from backend.services.action_executor import DurableActionExecutor
from backend.services.conversation_controller import ConversationController
from backend.services.negotiation_policy import classify_control
from backend.services.voice_repository import SqliteVoiceRepository
from backend.services.voice_auth import resolve_tenant


@pytest.fixture
def setup(tmp_path):
    repo = SqliteVoiceRepository(tmp_path / "test.db")
    ctx = InvoiceContext("tenant", "invoice", "contact", "PRIVATE-42", "Studio", "Aarav Mehta", 3000000, "INR", "rev1", CreditorMandate(authorized=True, version="v1", allowed_channels=["email"], human_target_id="rep"), verified_channels=["email"])
    repo.seed_context(ctx)
    executor = DurableActionExecutor(tmp_path / "test.db")
    return repo, executor, ConversationController(repo, executor), ctx


@pytest.mark.parametrize("utterance,intent", [
    ("Are you human?", "ai_identity"),
    ("I want to speak to the freelancer", "human_request"),
    ("yes, but the invoice is wrong", "dispute"),
    ("can talk but I am busy now", "busy"),
    ("yes maybe I will pay tomorrow", "tentative"),
    ("I can't pay, maybe next week", "tentative"),
    ("haan pehle meri baat sun lo", "listen"),
    ("Let me finish", "listen"),
    ("I can hear you", "audible"),
    ("Don't record that promise", "tentative"),
    ("Yes, don't call me again", "opt_out"),
    ("mera mn nhi hai sorry", "close"),
    ("tum freelancer se baat krwaa", "human_request"),
    ("me baat kar lunga us freelancer se", "direct_contact"),
    ("Maybe, but the invoice is wrong", "dispute"),
])
def test_complete_utterance_priority(utterance, intent):
    assert classify_control(utterance) == intent


@pytest.mark.asyncio
@pytest.mark.parametrize("utterance", ["What is the agenda?", "I can hear you", "can talk", "Aarav isn't here", "I am someone else"])
async def test_no_disclosure_from_unverified_speech(setup, utterance):
    repo, executor, controller, ctx = setup
    session = await controller.start_session("tenant", "invoice", "contact", "en-IN", "req")
    result = await controller.handle_turn("tenant", session.session_id, FinalTranscriptEvent("e1", utterance, 0, 1))
    current = await repo.get_session("tenant", session.session_id)
    assert not current.identity_verified
    assert "PRIVATE-42" not in result.reply and "30,000" not in result.reply
    assert result.tool_results == []


@pytest.mark.asyncio
async def test_silence_then_yes_only_confirms_hearing(setup):
    repo, _, controller, _ = setup
    session = await controller.start_session("tenant", "invoice", "contact", "en-IN", "req")
    await controller.handle_turn("tenant", session.session_id, FinalTranscriptEvent("e1", "", 0, 1))
    await controller.handle_turn("tenant", session.session_id, FinalTranscriptEvent("e2", "yes", 1, 2))
    assert not (await repo.get_session("tenant", session.session_id)).identity_verified


@pytest.mark.asyncio
async def test_listen_does_not_create_payment_commitment(setup):
    repo, _, controller, _ = setup
    session = await controller.start_session("tenant", "invoice", "contact", "hi-en", "req")
    await controller.handle_turn("tenant", session.session_id, FinalTranscriptEvent("e1", "Yes this is Aarav", 0, 1))
    result = await controller.handle_turn("tenant", session.session_id, FinalTranscriptEvent("e2", "pehle meri baat sun lo", 1, 2))
    assert result.intent == "listen" and len(result.reply.split()) < 12
    assert not result.tool_results
    assert (await repo.get_session("tenant", session.session_id)).pending_question == "availability"


@pytest.mark.asyncio
async def test_handoff_and_delivery_cannot_invent_receipts(setup):
    _, executor, _, ctx = setup
    for tool in ("request_human_handoff", "send_invoice_or_link"):
        request = ToolRequest(tool, tool, "tenant", "session", "invoice", "contact", 0, 0, "rev1", "v1", {"channel": "email", "target_id": "rep"})
        result = await executor.execute(request, ctx)
        assert result.status == "failed" and result.provider_reference is None


@pytest.mark.asyncio
async def test_receipts_are_scoped_and_preferences_are_durable(setup):
    _, executor, _, ctx = setup
    req = ToolRequest("record_channel_preference", "op1", "tenant", "session", "invoice", "contact", 0, 0, "rev1", "v1", {"channel": "email", "allowed": False})
    assert (await executor.execute(req, ctx)).status == "succeeded"
    other = replace(req, tenant_id="other")
    assert (await executor.execute(other, ctx)).status == "failed"
    conflict = replace(req, arguments={"channel": "email", "allowed": True})
    assert (await executor.execute(conflict, ctx)).detail_status == "operation_conflict"
    with executor._connection() as conn:
        assert conn.execute("SELECT allowed FROM contact_channel_preferences").fetchone()[0] == 0


def test_auth_rejects_missing_config_and_arbitrary_bearer(monkeypatch):
    monkeypatch.delenv("VOICE_INTERNAL_API_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    with pytest.raises(HTTPException):
        resolve_tenant(x_voice_internal_key="guessed", x_voice_tenant_id="victim")
    with pytest.raises(HTTPException):
        resolve_tenant(authorization="Bearer arbitrary", x_voice_tenant_id="victim")


def test_tenant_comes_from_trusted_membership(monkeypatch):
    import httpx
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "test")
    monkeypatch.setenv("VOICE_USER_TENANTS", json.dumps({"user1": "tenant1"}))
    monkeypatch.setattr(httpx, "get", lambda *a, **kw: httpx.Response(200, json={"id": "user1"}, request=httpx.Request("GET", a[0])))
    assert resolve_tenant("Bearer verified-test", x_voice_tenant_id="victim") == "tenant1"


def test_missing_model_does_not_get_evaluated_or_promoted(tmp_path):
    from training.evaluate import evaluate_run
    from training.package_model import package_model
    result = evaluate_run(tmp_path, output_path=tmp_path / "eval.json")
    assert result["status"] != "passed" and result["metrics"] == {}
    package = package_model(tmp_path, True, True, True)
    assert not package["promoted"] and not package["reloaded_verified"]
    assert not (tmp_path / "freeze_receipt.json").exists()


@pytest.mark.asyncio
@pytest.mark.parametrize("overrides,reason", [
    ({"currency": "USD"}, "currency_mismatch"),
    ({"date": "tomorrow"}, "invalid_date"),
    ({"amount_minor": True}, "invalid_amount"),
])
async def test_executor_revalidates_financial_slots(setup, overrides, reason):
    _, executor, _, ctx = setup
    args = {"amount_minor": 3000000, "date": "2026-11-20", "currency": "INR", **overrides}
    req = ToolRequest("record_ptp", "op1", "tenant", "session", "invoice", "contact", 0, 0, "rev1", "v1", args)
    assert (await executor.execute(req, ctx)).detail_status == reason
