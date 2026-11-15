from fastapi import FastAPI
from fastapi.testclient import TestClient
from backend.api.demo_router import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def turn(messages, language="en-IN"):
    return client.post("/v1/demo/turn", json={"messages": messages, "language": language})


def test_tentative_and_dispute_are_isolated():
    initial = turn(["Shayad Friday ko aadha de paun, promise mat samajhna."], "hi-en")
    assert initial.status_code == 200
    assert initial.json()["intent"] == "tentative"
    assert initial.json()["tool_receipts"] == []
    dispute = turn(["The invoice is wrong."])
    assert dispute.json()["state"] == "DISPUTED"
    assert dispute.json()["tool_receipts"][0]["data"]["sandbox"]
    assert turn(["Who are you?"]).json()["state"] == "DISCUSSING"


def test_demo_payload_bounds():
    for messages in ([], [" "], ["x" * 501], ["hello"] * 13):
        assert turn(messages).status_code == 422

def test_language_switch_preserves_opt_out():
    result = turn(["In English please, stop calling me."], "hi-en").json()
    assert result["end_call"] and result["language"] == "en-IN"
    assert result["intent"] == "opt_out"
