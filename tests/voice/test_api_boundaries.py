from tests.voice.test_voice_api import client, HEADERS, setup_invoice


def start():
    response = client.post("/v1/voice/sessions", headers=HEADERS, json={"invoice_id": "inv_api_1", "request_id": "bound"})
    assert response.status_code == 200
    return response.json()["session_id"]


def test_bound_call_cannot_be_rebound_or_used_without_call_sid(setup_invoice):
    sid = start()
    call = "CA" + "1" * 32
    assert client.post(f"/v1/voice/sessions/{sid}/bind-call", headers=HEADERS, json={"call_sid": call}).status_code == 200
    assert client.post(f"/v1/voice/sessions/{sid}/bind-call", headers=HEADERS, json={"call_sid": "CA" + "2" * 32}).status_code == 409
    turn = {"event_id": "e1", "transcript": "yes", "sequence": 1, "observed_state_version": 0}
    assert client.post(f"/v1/voice/sessions/{sid}/turns", headers=HEADERS, json=turn).status_code == 403
    turn["call_sid"] = call
    assert client.post(f"/v1/voice/sessions/{sid}/turns", headers=HEADERS, json=turn).status_code == 200


def test_api_rejects_overridden_facts_and_invalid_event(setup_invoice):
    assert client.post("/v1/voice/sessions", headers=HEADERS, json={"invoice_id": "inv_api_1", "request_id": "bad", "amount_due_minor": 1}).status_code == 422
    sid = start()
    bad = {"event_id": "e1", "transcript": "yes", "sequence": -1, "observed_state_version": 0}
    assert client.post(f"/v1/voice/sessions/{sid}/turns", headers=HEADERS, json=bad).status_code == 422
