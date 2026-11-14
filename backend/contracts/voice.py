"""Dependency-free, JSON-serializable voice contracts shared by all transports.

Provider transcripts and model suggestions never become authoritative invoice facts.
HTTP adapters may wrap these contracts with Pydantic without changing their meaning.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal, Protocol

LanguageMode = Literal["en-IN", "hi-en"]


class VoiceError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def require_identifier(value: str, field_name: str) -> None:
    if not isinstance(value, str) or not value.strip() or len(value) > 200:
        raise VoiceError("invalid_input", f"{field_name} is required and must be at most 200 characters")


def require_minor_units(value: int, field_name: str, *, allow_zero: bool = True) -> None:
    if type(value) is not int or value < (0 if allow_zero else 1):
        raise VoiceError("invalid_input", f"{field_name} must be integer minor units")


@dataclass
class CreditorMandate:
    authorized: bool = False
    version: str = ""
    allowed_channels: list[str] = field(default_factory=list)
    allow_installments: bool = False
    minimum_installment_minor: int = 0
    installment_due_date: str | None = None
    maximum_discount_bps: int = 0
    latest_due_date: str | None = None
    human_target_id: str | None = None
    contact_blocked: bool = False

    def __post_init__(self) -> None:
        if any(type(flag) is not bool for flag in (self.authorized, self.allow_installments, self.contact_blocked)):
            raise VoiceError("invalid_input", "Mandate flags must be boolean")
        if not isinstance(self.allowed_channels, list):
            raise VoiceError("invalid_input", "Invalid mandate channels")
        require_minor_units(self.minimum_installment_minor, "minimum_installment_minor")
        if type(self.maximum_discount_bps) is not int or not 0 <= self.maximum_discount_bps <= 10000:
            raise VoiceError("invalid_input", "maximum_discount_bps must be between 0 and 10000")
        if any(channel not in {"email", "whatsapp", "sms"} for channel in self.allowed_channels):
            raise VoiceError("invalid_input", "Unsupported delivery channel")


@dataclass
class InvoiceContext:
    tenant_id: str
    invoice_id: str
    contact_id: str
    invoice_number: str
    business_name: str
    contact_name: str
    amount_due_minor: int
    currency: str
    context_revision: str
    mandate: CreditorMandate
    deliverable: str = ""
    due_date: str | None = None
    payment_status: str = "unpaid"
    document_ids: list[str] = field(default_factory=list)
    verified_channels: list[str] = field(default_factory=list)
    contact_email: str | None = None
    contact_phone: str | None = None

    def __post_init__(self) -> None:
        for name in ("tenant_id", "invoice_id", "contact_id", "invoice_number", "business_name", "context_revision"):
            require_identifier(getattr(self, name), name)
        require_minor_units(self.amount_due_minor, "amount_due_minor")
        if self.currency not in {"INR", "USD"}:
            raise VoiceError("unsupported_currency", "Voice v1 supports INR and USD")
        if isinstance(self.mandate, dict):
            self.mandate = CreditorMandate(**self.mandate)
        if self.payment_status not in {"unpaid", "partial", "paid", "pending", "refunded", "disputed"}:
            raise VoiceError("invalid_input", "Unknown payment status")


@dataclass
class SessionSnapshot:
    session_id: str
    tenant_id: str
    invoice_id: str
    contact_id: str
    language_mode: LanguageMode
    state: str = "INTRODUCING"
    state_version: int = 0
    generation: int = 0
    identity_verified: bool = False
    pending_question: str | None = "identity"
    pending_ptp: dict[str, Any] | None = None
    selected_channel: str | None = None
    history: list[dict[str, str]] = field(default_factory=list)
    last_sequence: int = 0
    active_event_id: str | None = None
    outcome: str | None = None
    call_sid: str | None = None

    def __post_init__(self) -> None:
        if self.language_mode not in {"en-IN", "hi-en"}:
            raise VoiceError("invalid_language", "Choose en-IN or hi-en")

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class FinalTranscriptEvent:
    event_id: str
    transcript: str
    observed_state_version: int
    sequence: int
    language_mode: LanguageMode | None = None

    def __post_init__(self) -> None:
        require_identifier(self.event_id, "event_id")
        if not isinstance(self.transcript, str) or len(self.transcript) > 8000:
            raise VoiceError("invalid_input", "Transcript must contain at most 8000 characters")
        if type(self.observed_state_version) is not int or self.observed_state_version < 0:
            raise VoiceError("invalid_input", "Invalid state version")
        if type(self.sequence) is not int or self.sequence < 1:
            raise VoiceError("invalid_input", "Sequence must be a positive integer")
        if self.language_mode not in {None, "en-IN", "hi-en"}:
            raise VoiceError("invalid_language", "Unsupported language")


@dataclass
class ToolRequest:
    tool: str
    operation_id: str
    tenant_id: str
    session_id: str
    invoice_id: str
    contact_id: str
    expected_state_version: int
    generation: int
    context_revision: str
    mandate_version: str
    arguments: dict[str, Any] = field(default_factory=dict)


@dataclass
class ToolResult:
    operation_id: str
    status: Literal["pending", "succeeded", "failed", "unknown"]
    provider_reference: str | None = None
    detail_status: str | None = None
    data: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.status not in {"pending", "succeeded", "failed", "unknown"}:
            raise VoiceError("invalid_tool_result", "Unsupported tool result status")


@dataclass
class TurnResult:
    session_id: str
    event_id: str
    turn_id: str
    reply: str
    language_mode: LanguageMode
    state: str
    state_version: int
    intent: str
    should_end_call: bool = False
    outcome: str | None = None
    action_status: str | None = None
    tool_results: list[dict[str, Any]] = field(default_factory=list)
    route: str = "policy"
    model_used: str | None = None
    fact_refs: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class VoiceRepository(Protocol):
    async def get_context(self, tenant_id: str, invoice_id: str, contact_id: str) -> InvoiceContext: ...
    async def create_session(self, snapshot: SessionSnapshot, request_id: str) -> SessionSnapshot: ...
    async def get_session(self, tenant_id: str, session_id: str) -> SessionSnapshot: ...
    async def get_turn_result(self, tenant_id: str, session_id: str, event_id: str) -> TurnResult | None: ...
    async def claim_turn(self, tenant_id: str, session_id: str, event_id: str, expected_version: int, sequence: int) -> SessionSnapshot: ...
    async def commit_turn(self, tenant_id: str, session_id: str, event_id: str, expected_version: int, snapshot: SessionSnapshot, result: TurnResult) -> None: ...
    async def interrupt_session(self, tenant_id: str, session_id: str, event_id: str) -> SessionSnapshot: ...


class ToolExecutor(Protocol):
    async def execute(self, request: ToolRequest, context: InvoiceContext) -> ToolResult: ...


class UnavailableToolExecutor:
    """Fail closed when no durable executor has been configured."""

    async def execute(self, request: ToolRequest, context: InvoiceContext) -> ToolResult:
        return ToolResult(request.operation_id, "failed", detail_status="unconfigured")
