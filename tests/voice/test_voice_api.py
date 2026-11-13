"""FastAPI endpoints integration tests for /v1/voice."""

import pytest
from uuid import uuid4
from starlette.testclient import TestClient
from backend.main import app
from backend.contracts.voice import CreditorMandate, InvoiceContext
from backend.api.voice_router import voice_repository

client = TestClient(app)

INTERNAL_KEY = "revclaim-voice-internal-secret-2026"
HEADERS = {
    "X-Voice-Internal-Key": INTERNAL_KEY,
    "X-Voice-Tenant-Id": "tenant_api_test",
}


@pytest.fixture(autouse=True)
def setup_invoice():
    ctx = InvoiceContext(
        tenant_id="tenant_api_test",
        invoice_id="inv_api_1",
        contact_id="contact_api_1",
        invoice_number="INV-API-2026",
        business_name="Cloudscale Labs",
        contact_name="Pooja Sharma",
        amount_due_minor=1200000,
        currency="INR",
        context_revision="rev_1",
        mandate=CreditorMandate(
            authorized=True,
            version="m_v1",
            allowed_channels=["email"],
            allow_installments=False,
            human_target_id="support_rep",
        ),
        verified_channels=["email"],
    )
    voice_repository.seed_context(ctx)


def test_auth_rejection():
    # Calling without auth header must return 401
    resp = client.post("/v1/voice/sessions", json={
        "invoice_id": "inv_api_1",
        "contact_id": "contact_api_1",
        "language_mode": "en-IN",
        "transport": "browser",
        "request_id": "req_no_auth",
    })
    assert resp.status_code == 401


def test_session_lifecycle_and_turn():
    # 1. Create session
    req_id = f"req_{uuid4().hex[:8]}"
    resp = client.post("/v1/voice/sessions", headers=HEADERS, json={
        "invoice_id": "inv_api_1",
        "contact_id": "contact_api_1",
        "language_mode": "en-IN",
        "transport": "browser",
        "request_id": req_id,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "session_id" in data
    assert data["state"] == "INTRODUCING"
    assert "Cloudscale Labs" in data["reply"]
    session_id = data["session_id"]

    # 2. Get session
    get_resp = client.get(f"/v1/voice/sessions/{session_id}", headers=HEADERS)
    assert get_resp.status_code == 200
    assert get_resp.json()["session_id"] == session_id

    # 3. Submit turn (affirm identity)
    turn_resp = client.post(f"/v1/voice/sessions/{session_id}/turns", headers=HEADERS, json={
        "event_id": "evt_api_1",
        "transcript": "Yes, I am Pooja",
        "observed_state_version": 0,
        "sequence": 1,
    })
    assert turn_resp.status_code == 200
    turn_data = turn_resp.json()
    assert turn_data["state"] == "DISCUSSING"
    assert turn_data["state_version"] == 1

    # 4. Bind Call SID
    bind_resp = client.post(f"/v1/voice/sessions/{session_id}/bind-call", headers=HEADERS, json={
        "call_sid": "CA1234567890abcdef1234567890abcdef",
    })
    assert bind_resp.status_code == 200
    assert bind_resp.json()["call_sid"] == "CA1234567890abcdef1234567890abcdef"
