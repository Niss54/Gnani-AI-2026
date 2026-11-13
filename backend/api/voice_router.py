"""FastAPI router for /v1/voice endpoints.

Governed by canonical contracts in backend/contracts/voice.py.
Interfaced with frontend/lib/voice-client.ts.
Provides single shared conversation controller across Twilio and browser.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Literal, Optional
from uuid import uuid4

from fastapi import APIRouter, Header, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from backend.contracts.voice import (
    FinalTranscriptEvent,
    InvoiceContext,
    LanguageMode,
    SessionSnapshot,
    TurnResult,
    VoiceError,
)
from backend.services.action_executor import DurableActionExecutor
from backend.services.conversation_controller import ConversationController, opening_reply
from backend.services.provider_registry import OpenAICompatibleIntentProvider, ProviderRegistry
from backend.services.voice_repository import SqliteVoiceRepository

router = APIRouter(prefix="/v1/voice", tags=["Voice Agent"])

# Default DB path for local persistent storage
DB_PATH = Path(__file__).resolve().parents[1] / "data" / "voice.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# Shared instances
voice_repository = SqliteVoiceRepository(db_path=str(DB_PATH))
action_executor = DurableActionExecutor(db_path=str(DB_PATH))

_providers = []
_groq_key = os.getenv("GROQ_API_KEY", "").strip()
if _groq_key:
    _providers.append(
        OpenAICompatibleIntentProvider(
            name="groq-qwen",
            endpoint="https://api.groq.com/openai/v1/chat/completions",
            model="qwen/qwen3.8-27b",
            api_key=_groq_key,
        )
    )

provider_registry = ProviderRegistry(_providers, turn_timeout=2.0, attempt_timeout=1.0)
conversation_controller = ConversationController(
    repository=voice_repository,
    executor=action_executor,
    providers=provider_registry,
)


def _resolve_tenant(
    authorization: Optional[str] = Header(None),
    x_voice_internal_key: Optional[str] = Header(None, alias="X-Voice-Internal-Key"),
    x_voice_tenant_id: Optional[str] = Header(None, alias="X-Voice-Tenant-Id"),
) -> str:
    internal_key = os.getenv("VOICE_INTERNAL_API_KEY", "revclaim-voice-internal-secret-2026")
    if x_voice_internal_key:
        if x_voice_internal_key != internal_key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid internal voice key")
        return x_voice_tenant_id or "default_tenant"

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        # In a full deployment, decode JWT. For now, valid bearer token provides tenant identity.
        if token:
            return x_voice_tenant_id or "default_tenant"

    # Default tenant for development / sandbox if neither provided but in dev mode
    dev_tenant = os.getenv("VOICE_DEFAULT_TENANT_ID")
    if dev_tenant:
        return dev_tenant

    # If completely unauthenticated, raise 401
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Voice authentication required")


class StartSessionBody(BaseModel):
    invoice_id: str
    contact_id: Optional[str] = None
    language_mode: LanguageMode = "en-IN"
    transport: Literal["twilio", "browser"] = "browser"
    request_id: str


class TurnBody(BaseModel):
    event_id: str
    transcript: str
    observed_state_version: int
    sequence: int
    language_mode: Optional[LanguageMode] = None
    call_sid: Optional[str] = None


class InterruptBody(BaseModel):
    event_id: str


class BindCallBody(BaseModel):
    call_sid: str


def _format_snapshot(
    snapshot: SessionSnapshot,
    turn_result: Optional[TurnResult] = None,
    call_sid: Optional[str] = None,
) -> dict[str, Any]:
    latest_reply = ""
    for turn in reversed(snapshot.history):
        if turn.get("role") == "agent":
            latest_reply = turn.get("text", "")
            break

    effective_call_sid = call_sid or snapshot.call_sid
    return {
        "session_id": snapshot.session_id,
        "reply": turn_result.reply if turn_result else latest_reply,
        "language_mode": snapshot.language_mode,
        "state": snapshot.state,
        "state_version": snapshot.state_version,
        "sequence": snapshot.last_sequence,
        "call_sid": effective_call_sid,
        "outcome": snapshot.outcome,
        "should_end_call": turn_result.should_end_call if turn_result else (snapshot.state in {"CLOSED", "OPTED_OUT", "DISPUTED"}),
        "model_used": turn_result.model_used if turn_result else None,
        "action_status": turn_result.action_status if turn_result else None,
        "tool_results": turn_result.tool_results if turn_result else [],
    }


def _handle_voice_error(exc: VoiceError) -> None:
    code_map = {
        "invalid_input": status.HTTP_400_BAD_REQUEST,
        "invalid_language": status.HTTP_400_BAD_REQUEST,
        "unsupported_currency": status.HTTP_400_BAD_REQUEST,
        "not_found": status.HTTP_404_NOT_FOUND,
        "forbidden": status.HTTP_403_FORBIDDEN,
        "policy_rejected": status.HTTP_403_FORBIDDEN,
        "contact_blocked": status.HTTP_403_FORBIDDEN,
        "conflict": status.HTTP_409_CONFLICT,
        "stale_turn": status.HTTP_409_CONFLICT,
        "session_closed": status.HTTP_409_CONFLICT,
    }
    status_code = code_map.get(exc.code, status.HTTP_503_SERVICE_UNAVAILABLE)
    raise HTTPException(status_code=status_code, detail=str(exc))


@router.post("/sessions")
async def create_session(body: StartSessionBody, request: Request) -> dict[str, Any]:
    tenant_id = _resolve_tenant(
        authorization=request.headers.get("Authorization"),
        x_voice_internal_key=request.headers.get("X-Voice-Internal-Key"),
        x_voice_tenant_id=request.headers.get("X-Voice-Tenant-Id"),
    )

    contact_id = body.contact_id
    if not contact_id:
        with voice_repository._connection() as conn:
            row = conn.execute("SELECT contact_id FROM invoices WHERE tenant_id = ? AND invoice_id = ?", (tenant_id, body.invoice_id)).fetchone()
            contact_id = row["contact_id"] if row else f"contact_{body.invoice_id}"
    try:
        snapshot = await conversation_controller.start_session(
            tenant_id=tenant_id,
            invoice_id=body.invoice_id,
            contact_id=contact_id,
            language_mode=body.language_mode,
            request_id=body.request_id,
        )
        return _format_snapshot(snapshot)
    except VoiceError as exc:
        _handle_voice_error(exc)


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, request: Request) -> dict[str, Any]:
    tenant_id = _resolve_tenant(
        authorization=request.headers.get("Authorization"),
        x_voice_internal_key=request.headers.get("X-Voice-Internal-Key"),
        x_voice_tenant_id=request.headers.get("X-Voice-Tenant-Id"),
    )
    try:
        snapshot = await voice_repository.get_session(tenant_id, session_id)
        return _format_snapshot(snapshot)
    except VoiceError as exc:
        _handle_voice_error(exc)


@router.post("/sessions/{session_id}/turns")
async def submit_turn(session_id: str, body: TurnBody, request: Request) -> dict[str, Any]:
    tenant_id = _resolve_tenant(
        authorization=request.headers.get("Authorization"),
        x_voice_internal_key=request.headers.get("X-Voice-Internal-Key"),
        x_voice_tenant_id=request.headers.get("X-Voice-Tenant-Id"),
    )
    event = FinalTranscriptEvent(
        event_id=body.event_id,
        transcript=body.transcript,
        observed_state_version=body.observed_state_version,
        sequence=body.sequence,
        language_mode=body.language_mode,
    )
    try:
        result = await conversation_controller.handle_turn(tenant_id, session_id, event)
        snapshot = await voice_repository.get_session(tenant_id, session_id)
        return _format_snapshot(snapshot, turn_result=result, call_sid=body.call_sid)
    except VoiceError as exc:
        _handle_voice_error(exc)


@router.post("/sessions/{session_id}/interrupt")
async def interrupt_session(session_id: str, body: InterruptBody, request: Request) -> dict[str, Any]:
    tenant_id = _resolve_tenant(
        authorization=request.headers.get("Authorization"),
        x_voice_internal_key=request.headers.get("X-Voice-Internal-Key"),
        x_voice_tenant_id=request.headers.get("X-Voice-Tenant-Id"),
    )
    try:
        snapshot = await conversation_controller.interrupt(tenant_id, session_id, body.event_id)
        return _format_snapshot(snapshot)
    except VoiceError as exc:
        _handle_voice_error(exc)


@router.post("/sessions/{session_id}/bind-call")
async def bind_call(session_id: str, body: BindCallBody, request: Request) -> dict[str, Any]:
    tenant_id = _resolve_tenant(
        authorization=request.headers.get("Authorization"),
        x_voice_internal_key=request.headers.get("X-Voice-Internal-Key"),
        x_voice_tenant_id=request.headers.get("X-Voice-Tenant-Id"),
    )
    try:
        await voice_repository.bind_call_sid(tenant_id, session_id, body.call_sid)
        snapshot = await voice_repository.get_session(tenant_id, session_id)
        return _format_snapshot(snapshot, call_sid=body.call_sid)
    except VoiceError as exc:
        _handle_voice_error(exc)
