"""Public, isolated rehearsal of the same policy used for authenticated voice turns."""
from typing import Annotated, Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from backend.contracts.voice import CreditorMandate, FinalTranscriptEvent, InvoiceContext, SessionSnapshot, ToolResult
from backend.services.conversation_controller import ConversationController
from backend.services.voice_repository import SqliteVoiceRepository

router = APIRouter(prefix="/v1/demo", tags=["Demo"])
Message = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class DemoRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    messages: list[Message] = Field(min_length=1, max_length=12)
    language: Literal["en-IN", "hi-en"]


class SandboxTools:
    async def execute(self, request, context):
        # These actions affect the local conversation only. Delivery and
        # transfer always exercise the controller's unavailable-provider path.
        local = {"record_ptp", "pause_for_dispute", "record_opt_out", "record_wrong_number",
                 "record_channel_preference", "request_payment_review"}
        if request.tool in local:
            return ToolResult(request.operation_id, "succeeded", request.operation_id,
                              "sandbox_recorded", {"tool": request.tool, "sandbox": True})
        return ToolResult(request.operation_id, "failed", detail_status="sandbox_no_dispatch",
                          data={"tool": request.tool, "sandbox": True})


@router.post("/turn")
async def demo_turn(body: DemoRequest):
    repo = SqliteVoiceRepository()
    try:
        context = InvoiceContext("demo", "demo-invoice", "demo-contact", "DEMO-1042",
                                 "Apex Studio", "Aarav", 4500000, "INR", "demo-v1",
                                 CreditorMandate(authorized=True, version="demo-v1"))
        repo.seed_context(context)
        session = SessionSnapshot("demo-session", "demo", context.invoice_id, context.contact_id,
                                  body.language, state="DISCUSSING", identity_verified=True, pending_question=None)
        await repo.create_session(session, "demo-request")
        controller = ConversationController(repo, SandboxTools())
        version = 0
        receipts = []
        for sequence, transcript in enumerate(body.messages, 1):
            event = FinalTranscriptEvent(f"demo-{sequence}", transcript, version, sequence)
            result = await controller.handle_turn("demo", session.session_id, event)
            receipts.extend(result.tool_results)
            version = result.state_version
            if result.should_end_call:
                break
        return {"reply": result.reply, "intent": result.intent, "state": result.state,
                "end_call": result.should_end_call, "tool_receipts": receipts,
                "language": result.language_mode, "sandbox": True, "route": result.route}
    finally:
        repo.close()
