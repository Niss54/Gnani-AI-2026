"""Authoritative, tenant-isolated SQLite and in-memory repository for voice sessions.

Implements VoiceRepository protocol from backend.contracts.voice.
Strict tenant isolation, optimistic concurrency versioning, and zero demo-data fallbacks.
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Generator
from uuid import uuid4

try:
    from backend.contracts.voice import (
        CreditorMandate,
        InvoiceContext,
        LanguageMode,
        SessionSnapshot,
        TurnResult,
        VoiceError,
        VoiceRepository,
        require_identifier,
    )
except ImportError:
    from contracts.voice import (
        CreditorMandate,
        InvoiceContext,
        LanguageMode,
        SessionSnapshot,
        TurnResult,
        VoiceError,
        VoiceRepository,
        require_identifier,
    )


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SqliteVoiceRepository:
    """Durable SQLite implementation of VoiceRepository."""

    def __init__(self, db_path: str | Path = ":memory:") -> None:
        self.db_path = str(db_path)
        self._mem_conn = sqlite3.connect(":memory:", timeout=10.0, check_same_thread=False) if self.db_path == ":memory:" else None
        self._init_schema()

    @contextmanager
    def _connection(self) -> Generator[sqlite3.Connection, None, None]:
        if self._mem_conn:
            self._mem_conn.row_factory = sqlite3.Row
            try:
                yield self._mem_conn
                self._mem_conn.commit()
            except Exception:
                self._mem_conn.rollback()
                raise
            return

        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_schema(self) -> None:
        with self._connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS tenants (
                    tenant_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS contacts (
                    tenant_id TEXT NOT NULL,
                    contact_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    phone TEXT,
                    email TEXT,
                    is_blocked INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (tenant_id, contact_id)
                );

                CREATE TABLE IF NOT EXISTS contact_channel_preferences (
                    tenant_id TEXT NOT NULL, contact_id TEXT NOT NULL, channel TEXT NOT NULL, allowed INTEGER NOT NULL,
                    PRIMARY KEY (tenant_id, contact_id, channel)
                );

                CREATE TABLE IF NOT EXISTS invoices (
                    tenant_id TEXT NOT NULL,
                    invoice_id TEXT NOT NULL,
                    contact_id TEXT NOT NULL,
                    invoice_number TEXT NOT NULL,
                    business_name TEXT NOT NULL,
                    contact_name TEXT NOT NULL,
                    amount_due_minor INTEGER NOT NULL,
                    currency TEXT NOT NULL,
                    context_revision TEXT NOT NULL,
                    deliverable TEXT DEFAULT '',
                    due_date TEXT,
                    payment_status TEXT DEFAULT 'unpaid',
                    document_ids_json TEXT DEFAULT '[]',
                    verified_channels_json TEXT DEFAULT '[]',
                    mandate_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (tenant_id, invoice_id),
                    FOREIGN KEY (tenant_id, contact_id) REFERENCES contacts(tenant_id, contact_id)
                );

                CREATE TABLE IF NOT EXISTS voice_sessions (
                    session_id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    invoice_id TEXT NOT NULL,
                    contact_id TEXT NOT NULL,
                    language_mode TEXT NOT NULL,
                    state TEXT NOT NULL,
                    state_version INTEGER NOT NULL,
                    generation INTEGER NOT NULL,
                    identity_verified INTEGER NOT NULL,
                    pending_question TEXT,
                    pending_ptp_json TEXT,
                    selected_channel TEXT,
                    history_json TEXT NOT NULL,
                    last_sequence INTEGER NOT NULL,
                    active_event_id TEXT,
                    outcome TEXT,
                    call_sid TEXT,
                    request_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (tenant_id, invoice_id) REFERENCES invoices(tenant_id, invoice_id)
                );

                CREATE TABLE IF NOT EXISTS voice_turns (
                    session_id TEXT NOT NULL,
                    event_id TEXT NOT NULL,
                    tenant_id TEXT NOT NULL,
                    turn_id TEXT NOT NULL,
                    reply TEXT NOT NULL,
                    language_mode TEXT NOT NULL,
                    state TEXT NOT NULL,
                    state_version INTEGER NOT NULL,
                    intent TEXT NOT NULL,
                    should_end_call INTEGER NOT NULL,
                    outcome TEXT,
                    action_status TEXT,
                    tool_results_json TEXT NOT NULL,
                    route TEXT NOT NULL,
                    model_used TEXT,
                    fact_refs_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (session_id, event_id),
                    FOREIGN KEY (session_id) REFERENCES voice_sessions(session_id)
                );

                CREATE TABLE IF NOT EXISTS action_receipts (
                    operation_id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    invoice_id TEXT NOT NULL,
                    tool_name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    detail_status TEXT,
                    provider_reference TEXT,
                    arguments_json TEXT NOT NULL,
                    result_data_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON voice_sessions(tenant_id);
                CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
                CREATE INDEX IF NOT EXISTS idx_receipts_session ON action_receipts(session_id);
            """)

    def seed_context(self, context: InvoiceContext, contact_phone: str | None = None, contact_email: str | None = None) -> None:
        """Seed an authoritative context into the repository (used for setup and test fixtures)."""
        with self._connection() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO tenants (tenant_id, name, created_at) VALUES (?, ?, ?)",
                (context.tenant_id, context.business_name, _utc_now()),
            )
            conn.execute(
                """INSERT INTO contacts (tenant_id, contact_id, name, phone, email, is_blocked, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT (tenant_id, contact_id) DO UPDATE SET
                   name = excluded.name, phone = excluded.phone, email = excluded.email,
                   is_blocked = MAX(contacts.is_blocked, excluded.is_blocked)""",
                (
                    context.tenant_id,
                    context.contact_id,
                    context.contact_name,
                    contact_phone,
                    contact_email,
                    1 if context.mandate.contact_blocked else 0,
                    _utc_now(),
                ),
            )
            mandate_dict = {
                "authorized": context.mandate.authorized,
                "version": context.mandate.version,
                "allowed_channels": context.mandate.allowed_channels,
                "allow_installments": context.mandate.allow_installments,
                "minimum_installment_minor": context.mandate.minimum_installment_minor,
                "installment_due_date": context.mandate.installment_due_date,
                "maximum_discount_bps": context.mandate.maximum_discount_bps,
                "latest_due_date": context.mandate.latest_due_date,
                "human_target_id": context.mandate.human_target_id,
                "contact_blocked": context.mandate.contact_blocked,
            }
            conn.execute(
                """INSERT INTO invoices (
                    tenant_id, invoice_id, contact_id, invoice_number, business_name, contact_name,
                    amount_due_minor, currency, context_revision, deliverable, due_date, payment_status,
                    document_ids_json, verified_channels_json, mandate_json, created_at, updated_at
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT (tenant_id, invoice_id) DO UPDATE SET
                    amount_due_minor = excluded.amount_due_minor,
                    payment_status = CASE WHEN invoices.payment_status = 'disputed' THEN 'disputed'
                                          ELSE excluded.payment_status END,
                    contact_id = excluded.contact_id, invoice_number = excluded.invoice_number,
                    business_name = excluded.business_name, contact_name = excluded.contact_name,
                    currency = excluded.currency, deliverable = excluded.deliverable,
                    due_date = excluded.due_date, document_ids_json = excluded.document_ids_json,
                    verified_channels_json = excluded.verified_channels_json,
                    context_revision = excluded.context_revision,
                    mandate_json = excluded.mandate_json,
                    updated_at = excluded.updated_at""",
                (
                    context.tenant_id,
                    context.invoice_id,
                    context.contact_id,
                    context.invoice_number,
                    context.business_name,
                    context.contact_name,
                    context.amount_due_minor,
                    context.currency,
                    context.context_revision,
                    context.deliverable,
                    context.due_date,
                    context.payment_status,
                    json.dumps(context.document_ids),
                    json.dumps(context.verified_channels),
                    json.dumps(mandate_dict),
                    _utc_now(),
                    _utc_now(),
                ),
            )

    async def resolve_contact_id(self, tenant_id: str, invoice_id: str) -> str:
        with self._connection() as conn:
            row = conn.execute("SELECT contact_id FROM invoices WHERE tenant_id=? AND invoice_id=?",
                               (tenant_id, invoice_id)).fetchone()
        if row is None:
            raise VoiceError("not_found", "Invoice not found for this tenant")
        return row["contact_id"]

    async def get_context(self, tenant_id: str, invoice_id: str, contact_id: str) -> InvoiceContext:
        require_identifier(tenant_id, "tenant_id")
        require_identifier(invoice_id, "invoice_id")
        require_identifier(contact_id, "contact_id")

        with self._connection() as conn:
            cursor = conn.execute(
                """SELECT i.*, c.is_blocked, c.phone, c.email FROM invoices i
                   JOIN contacts c ON c.tenant_id=i.tenant_id AND c.contact_id=i.contact_id
                   WHERE i.tenant_id = ? AND i.invoice_id = ?""",
                (tenant_id, invoice_id),
            )
            row = cursor.fetchone()
            if not row:
                raise VoiceError("not_found", f"Invoice {invoice_id} not found for tenant")

            if row["contact_id"] != contact_id:
                raise VoiceError("forbidden", "Contact ID does not match invoice recipient")

            mandate_data = json.loads(row["mandate_json"])
            mandate_data["contact_blocked"] = bool(row["is_blocked"]) or mandate_data.get("contact_blocked", False)
            mandate = CreditorMandate(**mandate_data)
            denied = {r[0] for r in conn.execute(
                "SELECT channel FROM contact_channel_preferences WHERE tenant_id=? AND contact_id=? AND allowed=0",
                (tenant_id, contact_id))}
            if "phone" in denied:
                mandate.contact_blocked = True

            return InvoiceContext(
                tenant_id=row["tenant_id"],
                invoice_id=row["invoice_id"],
                contact_id=row["contact_id"],
                invoice_number=row["invoice_number"],
                business_name=row["business_name"],
                contact_name=row["contact_name"],
                amount_due_minor=row["amount_due_minor"],
                currency=row["currency"],
                context_revision=row["context_revision"],
                mandate=mandate,
                deliverable=row["deliverable"] or "",
                due_date=row["due_date"],
                payment_status=row["payment_status"],
                document_ids=json.loads(row["document_ids_json"] or "[]"),
                verified_channels=[c for c in json.loads(row["verified_channels_json"] or "[]") if c not in denied],
                contact_email=row["email"], contact_phone=row["phone"],
            )

    async def create_session(self, snapshot: SessionSnapshot, request_id: str) -> SessionSnapshot:
        require_identifier(snapshot.session_id, "session_id")
        require_identifier(snapshot.tenant_id, "tenant_id")
        require_identifier(request_id, "request_id")

        now = _utc_now()
        with self._connection() as conn:
            conn.execute("BEGIN IMMEDIATE")
            cursor = conn.execute(
                """SELECT session_id, tenant_id, invoice_id, contact_id, language_mode,
                          state, state_version, generation, identity_verified, pending_question,
                          pending_ptp_json, selected_channel, history_json, last_sequence,
                          active_event_id, outcome, call_sid
                   FROM voice_sessions WHERE tenant_id = ? AND request_id = ?""",
                (snapshot.tenant_id, request_id),
            )
            existing = cursor.fetchone()
            if existing:
                if (existing["invoice_id"], existing["contact_id"]) != (snapshot.invoice_id, snapshot.contact_id):
                    raise VoiceError("conflict", "Request ID already belongs to a different session request")
                return self._row_to_snapshot(existing)

            conn.execute(
                """INSERT INTO voice_sessions (
                    session_id, tenant_id, invoice_id, contact_id, language_mode,
                    state, state_version, generation, identity_verified, pending_question,
                    pending_ptp_json, selected_channel, history_json, last_sequence,
                    active_event_id, outcome, call_sid, request_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    snapshot.session_id,
                    snapshot.tenant_id,
                    snapshot.invoice_id,
                    snapshot.contact_id,
                    snapshot.language_mode,
                    snapshot.state,
                    snapshot.state_version,
                    snapshot.generation,
                    1 if snapshot.identity_verified else 0,
                    snapshot.pending_question,
                    json.dumps(snapshot.pending_ptp) if snapshot.pending_ptp else None,
                    snapshot.selected_channel,
                    json.dumps(snapshot.history),
                    snapshot.last_sequence,
                    snapshot.active_event_id,
                    snapshot.outcome,
                    None,
                    request_id,
                    now,
                    now,
                ),
            )
            return snapshot

    async def get_session(self, tenant_id: str, session_id: str) -> SessionSnapshot:
        require_identifier(tenant_id, "tenant_id")
        require_identifier(session_id, "session_id")

        with self._connection() as conn:
            cursor = conn.execute(
                """SELECT session_id, tenant_id, invoice_id, contact_id, language_mode,
                          state, state_version, generation, identity_verified, pending_question,
                          pending_ptp_json, selected_channel, history_json, last_sequence,
                          active_event_id, outcome, call_sid
                   FROM voice_sessions WHERE session_id = ?""",
                (session_id,),
            )
            row = cursor.fetchone()
            if not row:
                raise VoiceError("not_found", f"Session {session_id} not found")
            if row["tenant_id"] != tenant_id:
                raise VoiceError("forbidden", "Session belongs to another tenant")

            return self._row_to_snapshot(row)

    async def get_turn_result(self, tenant_id: str, session_id: str, event_id: str) -> TurnResult | None:
        require_identifier(tenant_id, "tenant_id")
        require_identifier(session_id, "session_id")
        require_identifier(event_id, "event_id")

        with self._connection() as conn:
            cursor = conn.execute(
                """SELECT * FROM voice_turns WHERE session_id = ? AND event_id = ? AND tenant_id = ?""",
                (session_id, event_id, tenant_id),
            )
            row = cursor.fetchone()
            if not row:
                return None

            return TurnResult(
                session_id=row["session_id"],
                event_id=row["event_id"],
                turn_id=row["turn_id"],
                reply=row["reply"],
                language_mode=row["language_mode"],
                state=row["state"],
                state_version=row["state_version"],
                intent=row["intent"],
                should_end_call=bool(row["should_end_call"]),
                outcome=row["outcome"],
                action_status=row["action_status"],
                tool_results=json.loads(row["tool_results_json"]),
                route=row["route"],
                model_used=row["model_used"],
                fact_refs=json.loads(row["fact_refs_json"]),
            )

    async def claim_turn(
        self,
        tenant_id: str,
        session_id: str,
        event_id: str,
        expected_version: int,
        sequence: int,
    ) -> SessionSnapshot:
        require_identifier(tenant_id, "tenant_id")
        require_identifier(session_id, "session_id")
        require_identifier(event_id, "event_id")

        with self._connection() as conn:
            cursor = conn.execute(
                """SELECT * FROM voice_sessions WHERE session_id = ?""",
                (session_id,),
            )
            row = cursor.fetchone()
            if not row:
                raise VoiceError("not_found", f"Session {session_id} not found")
            if row["tenant_id"] != tenant_id:
                raise VoiceError("forbidden", "Session belongs to another tenant")
            if row["state_version"] != expected_version:
                raise VoiceError("conflict", f"State version mismatch (current: {row['state_version']}, expected: {expected_version})")
            if sequence <= row["last_sequence"]:
                raise VoiceError("conflict", f"Sequence {sequence} has already been processed")

            conn.execute(
                """UPDATE voice_sessions
                   SET active_event_id = ?, last_sequence = ?, updated_at = ?
                   WHERE session_id = ? AND state_version = ?""",
                (event_id, sequence, _utc_now(), session_id, expected_version),
            )
            snapshot = self._row_to_snapshot(row)
            snapshot.active_event_id = event_id
            snapshot.last_sequence = sequence
            return snapshot

    async def commit_turn(
        self,
        tenant_id: str,
        session_id: str,
        event_id: str,
        expected_version: int,
        snapshot: SessionSnapshot,
        result: TurnResult,
    ) -> None:
        require_identifier(tenant_id, "tenant_id")
        require_identifier(session_id, "session_id")
        require_identifier(event_id, "event_id")

        with self._connection() as conn:
            cursor = conn.execute(
                """UPDATE voice_sessions
                   SET state = ?, state_version = ?, generation = ?, identity_verified = ?,
                       pending_question = ?, pending_ptp_json = ?, selected_channel = ?,
                       history_json = ?, active_event_id = NULL, outcome = ?, language_mode = ?,
                       updated_at = ?
                   WHERE session_id = ? AND tenant_id = ? AND state_version = ?""",
                (
                    snapshot.state,
                    snapshot.state_version,
                    snapshot.generation,
                    1 if snapshot.identity_verified else 0,
                    snapshot.pending_question,
                    json.dumps(snapshot.pending_ptp) if snapshot.pending_ptp else None,
                    snapshot.selected_channel,
                    json.dumps(snapshot.history),
                    snapshot.outcome,
                    snapshot.language_mode,
                    _utc_now(),
                    session_id,
                    tenant_id,
                    expected_version,
                ),
            )
            if cursor.rowcount == 0:
                raise VoiceError("conflict", "Optimistic concurrency conflict while committing turn")

            conn.execute(
                """INSERT INTO voice_turns (
                    session_id, event_id, tenant_id, turn_id, reply, language_mode,
                    state, state_version, intent, should_end_call, outcome, action_status,
                    tool_results_json, route, model_used, fact_refs_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    session_id,
                    event_id,
                    tenant_id,
                    result.turn_id,
                    result.reply,
                    result.language_mode,
                    result.state,
                    result.state_version,
                    result.intent,
                    1 if result.should_end_call else 0,
                    result.outcome,
                    result.action_status,
                    json.dumps(result.tool_results),
                    result.route,
                    result.model_used,
                    json.dumps(result.fact_refs),
                    _utc_now(),
                ),
            )

    async def interrupt_session(self, tenant_id: str, session_id: str, event_id: str) -> SessionSnapshot:
        require_identifier(tenant_id, "tenant_id")
        require_identifier(session_id, "session_id")

        with self._connection() as conn:
            cursor = conn.execute(
                """SELECT * FROM voice_sessions WHERE session_id = ?""",
                (session_id,),
            )
            row = cursor.fetchone()
            if not row:
                raise VoiceError("not_found", f"Session {session_id} not found")
            if row["tenant_id"] != tenant_id:
                raise VoiceError("forbidden", "Session belongs to another tenant")

            new_generation = row["generation"] + 1
            conn.execute(
                """UPDATE voice_sessions
                   SET generation = ?, active_event_id = NULL, updated_at = ?
                   WHERE session_id = ?""",
                (new_generation, _utc_now(), session_id),
            )
            snapshot = self._row_to_snapshot(row)
            snapshot.generation = new_generation
            snapshot.active_event_id = None
            return snapshot

    async def bind_call_sid(self, tenant_id: str, session_id: str, call_sid: str) -> None:
        require_identifier(call_sid, "call_sid")
        with self._connection() as conn:
            cursor = conn.execute(
                """UPDATE voice_sessions SET call_sid = ?, updated_at = ?
                   WHERE session_id = ? AND tenant_id = ? AND (call_sid IS NULL OR call_sid = ?)""",
                (call_sid, _utc_now(), session_id, tenant_id, call_sid),
            )
            if cursor.rowcount == 0:
                raise VoiceError("conflict", "Session unavailable or already bound to another call")

    @staticmethod
    def _row_to_snapshot(row: sqlite3.Row) -> SessionSnapshot:
        return SessionSnapshot(
            session_id=row["session_id"],
            tenant_id=row["tenant_id"],
            invoice_id=row["invoice_id"],
            contact_id=row["contact_id"],
            language_mode=row["language_mode"],
            state=row["state"],
            state_version=row["state_version"],
            generation=row["generation"],
            identity_verified=bool(row["identity_verified"]),
            pending_question=row["pending_question"],
            pending_ptp=json.loads(row["pending_ptp_json"]) if row["pending_ptp_json"] else None,
            selected_channel=row["selected_channel"],
            history=json.loads(row["history_json"]),
            last_sequence=row["last_sequence"],
            active_event_id=row["active_event_id"],
            outcome=row["outcome"],
            call_sid=row["call_sid"] if "call_sid" in row.keys() else None,
        )
