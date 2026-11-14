"""Grounded shared voice controller. Transport adapters own audio, never policy.

This baseline renders reviewed templates and uses models only to propose intent.
It makes no claim of being a fine-tuned model or of passing acoustic qualification.
"""

from __future__ import annotations

import asyncio
import copy
import re
from dataclasses import asdict
from datetime import date, datetime
from typing import Callable
from uuid import uuid4
from zoneinfo import ZoneInfo

try:
    from backend.contracts.voice import (
        FinalTranscriptEvent, InvoiceContext, LanguageMode, SessionSnapshot,
        ToolExecutor, ToolRequest, ToolResult, TurnResult, UnavailableToolExecutor,
        VoiceError, VoiceRepository, require_identifier,
    )
    from backend.services.negotiation_policy import (
        allowed_channels, assert_context_authorized, classify_control, explicit_date, matches,
    )
    from backend.services.provider_registry import ProviderRegistry
    from backend.services.speech_normalizer import normalize_transcript, parse_explicit_amount, render_for_speech, spoken_money
except ImportError:
    from contracts.voice import (
        FinalTranscriptEvent, InvoiceContext, LanguageMode, SessionSnapshot,
        ToolExecutor, ToolRequest, ToolResult, TurnResult, UnavailableToolExecutor,
        VoiceError, VoiceRepository, require_identifier,
    )
    from services.negotiation_policy import (
        allowed_channels, assert_context_authorized, classify_control, explicit_date, matches,
    )
    from services.provider_registry import ProviderRegistry
    from services.speech_normalizer import normalize_transcript, parse_explicit_amount, render_for_speech, spoken_money


def india_today() -> date:
    try:
        return datetime.now(ZoneInfo("Asia/Kolkata")).date()
    except Exception:
        from datetime import timezone, timedelta
        return datetime.now(timezone(timedelta(hours=5, minutes=30))).date()


def localized(language: LanguageMode, english: str, hinglish: str) -> str:
    return hinglish if language == "hi-en" else english


def opening_reply(context: InvoiceContext, language: LanguageMode) -> str:
    return localized(language,
        f"Hello, I'm {context.business_name}'s AI billing assistant. Am I speaking with {context.contact_name}?",
        f"Namaste, main {context.business_name} ki AI billing assistant hoon. Kya meri baat {context.contact_name} se ho rahi hai?")


class ConversationController:
    def __init__(self, repository: VoiceRepository, executor: ToolExecutor | None = None,
                 providers: ProviderRegistry | None = None, *, today: Callable[[], date] = india_today,
                 tool_timeout: float = 3.0) -> None:
        self.repository = repository
        self.executor = executor or UnavailableToolExecutor()
        self.providers = providers or ProviderRegistry()
        self.today = today
        self.tool_timeout = tool_timeout

    async def start_session(self, tenant_id: str, invoice_id: str, contact_id: str,
                            language_mode: LanguageMode, request_id: str) -> SessionSnapshot:
        for name, value in (("tenant_id", tenant_id), ("invoice_id", invoice_id), ("contact_id", contact_id), ("request_id", request_id)):
            require_identifier(value, name)
        context = await self.repository.get_context(tenant_id, invoice_id, contact_id)
        assert_context_authorized(context, tenant_id)
        if context.invoice_id != invoice_id or context.contact_id != contact_id:
            raise VoiceError("forbidden", "Context association does not match the request")
        snapshot = SessionSnapshot(str(uuid4()), tenant_id, invoice_id, contact_id, language_mode)
        snapshot.history.append({"role": "agent", "text": opening_reply(context, language_mode)})
        return await self.repository.create_session(snapshot, request_id)

    async def interrupt(self, tenant_id: str, session_id: str, event_id: str) -> SessionSnapshot:
        require_identifier(event_id, "event_id")
        return await self.repository.interrupt_session(tenant_id, session_id, event_id)

    async def handle_turn(self, tenant_id: str, session_id: str, event: FinalTranscriptEvent) -> TurnResult:
        previous = await self.repository.get_turn_result(tenant_id, session_id, event.event_id)
        if previous:
            return previous
        current = await self.repository.get_session(tenant_id, session_id)
        if current.tenant_id != tenant_id:
            raise VoiceError("forbidden", "Session belongs to another tenant")
        if current.state in {"CLOSED", "OPTED_OUT", "DISPUTED"}:
            raise VoiceError("session_closed", "This conversation has ended")
        context = await self.repository.get_context(tenant_id, current.invoice_id, current.contact_id)
        assert_context_authorized(context, tenant_id)
        claimed = await self.repository.claim_turn(tenant_id, session_id, event.event_id, event.observed_state_version, event.sequence)
        snapshot = copy.deepcopy(claimed)
        text = normalize_transcript(event.transcript)
        if event.language_mode:
            snapshot.language_mode = event.language_mode
        if matches(text, r"\b(in english|english (please|mein|me|mai|bolo))\b|इंग्लिश में|अंग्रेजी में"):
            snapshot.language_mode = "en-IN"
            intent = "language_switch"
        elif matches(text, r"\b(in hinglish|hinglish (please|mein|me|mai|bolo)|hindi (mein|me|mai|bolo))\b|हिंदी में"):
            snapshot.language_mode = "hi-en"
            intent = "language_switch"
        else:
            intent = classify_control(text)
        model_used = None
        route = "policy"
        try:
            if intent is None:
                suggestion = await self.providers.suggest(snapshot, context, text)
                intent, model_used, route = suggestion.intent, suggestion.model_used, suggestion.route
            await self._ensure_current(claimed)
            snapshot.history.append({"role": "client", "text": text})
            result = await self._respond(snapshot, context, event, intent)
            result.model_used, result.route = model_used, route
            result.reply = render_for_speech(result.reply)
            snapshot.history.append({"role": "agent", "text": result.reply})
            snapshot.history = snapshot.history[-24:]
            snapshot.active_event_id = None
            snapshot.state_version = claimed.state_version + 1
            result.state_version = snapshot.state_version
            await self.repository.commit_turn(tenant_id, session_id, event.event_id, claimed.state_version, snapshot, result)
            return result
        except asyncio.CancelledError:
            await self.repository.interrupt_session(tenant_id, session_id, f"cancel:{event.event_id}")
            raise

    async def _ensure_current(self, snapshot: SessionSnapshot) -> None:
        latest = await self.repository.get_session(snapshot.tenant_id, snapshot.session_id)
        if latest.state_version != snapshot.state_version or latest.generation != snapshot.generation:
            raise VoiceError("stale_turn", "Turn was interrupted or replaced")

    async def _tool(self, snapshot: SessionSnapshot, context: InvoiceContext,
                    event: FinalTranscriptEvent, name: str, arguments: dict) -> ToolResult:
        await self._ensure_current(snapshot)
        request = ToolRequest(name, f"{snapshot.session_id}:{event.event_id}:{name}", snapshot.tenant_id,
                              snapshot.session_id, snapshot.invoice_id, snapshot.contact_id,
                              snapshot.state_version, snapshot.generation, context.context_revision,
                              context.mandate.version, arguments)
        try:
            result = await asyncio.wait_for(self.executor.execute(request, context), timeout=self.tool_timeout)
            if result.operation_id != request.operation_id:
                return ToolResult(request.operation_id, "unknown", detail_status="mismatched_receipt")
            return result
        except asyncio.CancelledError:
            raise
        except TimeoutError:
            return ToolResult(request.operation_id, "unknown", detail_status="timeout_pending_reconciliation")
        except (OSError, ValueError, RuntimeError):
            return ToolResult(request.operation_id, "unknown", detail_status="executor_error")

    async def _respond(self, session: SessionSnapshot, context: InvoiceContext,
                       event: FinalTranscriptEvent, intent: str) -> TurnResult:
        text = event.transcript
        language = session.language_mode
        say = lambda en, hi: localized(language, en, hi)
        reply: str | None = None
        end = False
        receipts: list[dict] = []
        facts: list[str] = []

        async def act(name: str, arguments: dict) -> ToolResult:
            receipt = await self._tool(session, context, event, name, arguments)
            receipts.append(asdict(receipt))
            return receipt

        if intent in {"opt_out", "wrong_number", "dispute"}:
            tool = {"opt_out": "record_opt_out", "wrong_number": "record_wrong_number", "dispute": "pause_for_dispute"}[intent]
            receipt = await act(tool, {"reason": text, "channel": "phone"})
            if receipt.status == "succeeded":
                session.state = "OPTED_OUT" if intent == "opt_out" else ("DISPUTED" if intent == "dispute" else "CLOSED")
                session.outcome = intent
                reply = {"opt_out": say("Further calls are now stopped. I'll end this call.", "Aage ki calls rok di gayi hain. Main ab call end karti hoon."),
                         "wrong_number": say("Sorry, I've flagged this number and stopped this follow-up.", "Sorry, number review ke liye mark ho gaya hai. Main call end karti hoon."),
                         "dispute": say("The payment follow-up is paused for review. I'll end this call.", "Payment follow-up review ke liye pause ho gaya hai. Main call end karti hoon.")}[intent]
            else:
                session.state = "CLOSED"
                session.outcome = f"{intent}_persistence_required"
                reply = say("I'll end this call. I couldn't confirm the record update, so this needs a human review.", "Main call end karti hoon. Record update confirm nahi hua, isliye human review chahiye.")
            session.pending_question, session.pending_ptp = None, None
            end = True
        elif intent in {"safety_close", "close", "busy", "direct_contact"}:
            session.state, session.outcome, end = "CLOSED", intent, True
            session.pending_question, session.pending_ptp = None, None
            reply = say("Understood. I'll let you go and end this call.", "Theek hai, main ab call end karti hoon.")
        elif intent == "human_request":
            receipt = await act("request_human_handoff", {"target_id": context.mandate.human_target_id}) if context.mandate.human_target_id else None
            if receipt and receipt.status == "succeeded" and receipt.detail_status == "human_accepted":
                session.state, session.outcome, end = "CLOSED", "human_handoff", True
                reply = say("The person has accepted the transfer. I'll let you speak with them.", "Unhone transfer accept kar liya hai. Ab aap unse baat kar sakte hain.")
            elif receipt and receipt.status in {"pending", "succeeded"} and receipt.detail_status in {"connecting", "destination_answered"}:
                session.state, session.outcome = "HANDOFF_REQUESTED", "handoff_pending"
                reply = say("I'm waiting for someone to accept the transfer.", "Transfer accept hone ka wait kar rahi hoon.")
            else:
                session.state, session.outcome, end = "CLOSED", "human_unavailable", True
                reply = say("I can't connect you to a person right now. Please use your usual business contact.", "Abhi kisi person se connect nahi ho pa raha. Aap apne known business contact se baat kar sakte hain.")
        elif intent in {"ai_identity", "trust"}:
            facts = ["business_name"]
            reply = say(f"I'm {context.business_name}'s AI billing assistant. You can verify this with your usual contact before paying.",
                        f"Main {context.business_name} ki AI billing assistant hoon. Payment se pehle apne known contact se verify kar sakte hain.")
        elif intent == "listen":
            reply = say("Go ahead, I'm listening.", "Ji, aap apni baat poori kijiye.")
        elif intent == "agenda":
            if session.identity_verified:
                facts = ["invoice_number", "amount_due_minor", "currency"]
                reply = say(f"This is about invoice {context.invoice_number}, with a recorded balance of {spoken_money(context.amount_due_minor, context.currency, language)}. Is there anything you want to clarify?",
                            f"Yeh invoice {context.invoice_number} ke {spoken_money(context.amount_due_minor, context.currency, language)} recorded balance ke baare mein hai. Aap kya clarify karna chahenge?")
            else:
                session.pending_question = "identity"
                reply = say(f"It's a billing follow-up. Before sharing details, am I speaking with {context.contact_name}?",
                            f"Billing follow-up hai. Details se pehle, kya aap {context.contact_name} hain?")
        elif intent == "secrets":
            reply = say("Please don't share an OTP, PIN or card details with me.", "OTP, PIN ya card details mujhe mat batayiye.")
        elif intent == "legal_boundary":
            reply = say("I don't make legal decisions. Please discuss that with an authorized person.", "Main legal decision nahi leti. Iske liye authorized person se baat kar lijiye.")
        elif intent == "language_switch":
            reply = say("I'll continue in English.", "Theek hai, Hinglish mein baat karte hain.")
        elif intent == "repeat":
            last_agent_text = next((h["text"] for h in reversed(session.history) if h["role"] == "agent"), None)
            prefix = say("I'll speak a little more clearly. ", "Main thoda dheere bolti hoon. ")
            reply = f"{prefix}{last_agent_text}" if last_agent_text else opening_reply(context, language)
        elif intent == "silence":
            if session.pending_question == "audibility_retry":
                session.state, session.outcome, end = "CLOSED", "silence", True
                reply = say("The connection may not be clear. I'll end this call.", "Shayad connection clear nahi hai. Main ab call end karti hoon.")
            else:
                session.pending_question = "audibility_retry"
                reply = say("Can you hear me?", "Kya aap mujhe sun pa rahe hain?")
        elif not session.identity_verified:
            # Availability and audibility are not identity confirmation.
            audibility = matches(text, r"hear|sun raha|sun pa|सुन रहा|सुन पा|हियर")
            name = re.escape(context.contact_name.split()[0])
            self_identified = matches(text, rf"\b(?:i am|this is|main)\s+{name}\b")
            confirmation = not audibility and (self_identified or (intent == "affirm" and matches(text, r"^(yes|yeah|yep|haan|han|ji|speaking|हाँ|हां|जी|यस)\b|^(हाँ|हां|जी|यस)")))
            if confirmation and session.pending_question == "identity":
                session.identity_verified = True
                session.state, session.pending_question = "DISCUSSING", "availability"
                reply = say(
                    f"Thank you, {context.contact_name}. I'm following up regarding {context.business_name}'s invoice {context.invoice_number} with a balance of {spoken_money(context.amount_due_minor, context.currency, language)}. Is now a suitable time to discuss this?",
                    f"Shukriya {context.contact_name} ji. Main {context.business_name} ke pending invoice {context.invoice_number} ke silsile mein call kar rahi hoon, jiska {spoken_money(context.amount_due_minor, context.currency, language)} ka balance due hai. Kya abhi hum is baare mein baat kar sakte hain?"
                )
            elif intent == "greeting" and session.pending_question == "identity":
                reply = say(
                    f"Hello! I'm {context.business_name}'s AI billing assistant. Am I speaking with {context.contact_name}?",
                    f"Namaste! Main {context.business_name} ki AI billing assistant hoon. Kya meri baat {context.contact_name} se ho rahi hai?"
                )
            elif intent == "deny" and session.pending_question == "identity":
                session.state, session.outcome, end = "CLOSED", "identity_not_confirmed", True
                reply = say("Sorry, I'll end this call without discussing invoice details.", "Sorry, invoice details discuss kiye bina call end karti hoon.")
            else:
                session.pending_question = "identity"
                reply = say(f"Before discussing invoice details, am I speaking with {context.contact_name}?", f"Invoice details se pehle confirm kar loon, kya aap {context.contact_name} hain?")
        elif context.payment_status == "paid" or context.amount_due_minor == 0:
            session.state, session.outcome, end = "CLOSED", "verified_paid", True
            facts = ["payment_status", "amount_due_minor"]
            reply = say("The current ledger shows this invoice paid. No further payment is needed for it.", "Current ledger mein yeh invoice paid hai. Iske liye aur payment ki zarurat nahi.")
        elif intent == "channel_refusal":
            channel = next((c for c in ("email", "whatsapp", "sms") if c in text.lower()), "email")
            receipt = await act("record_channel_preference", {"channel": channel, "allowed": False})
            session.selected_channel = None
            reply = say(f"I won't send anything by {channel} during this call.", f"Is call mein {channel} par kuch nahi bhejungi.")
        elif intent == "already_paid":
            receipt = await act("request_payment_review", {"client_claim": "already_paid"})
            session.state, session.outcome, end = "CLOSED", "payment_review_required", True
            reply = say("The ledger doesn't yet show confirmation. I won't ask you to pay again; this needs a review.", "Ledger mein confirmation abhi nahi dikh rahi. Dobara payment nahi maangungi; review chahiye.")
        elif intent == "proof":
            if context.document_ids:
                session.pending_question = "proof_channel"
                reply = self._channel_prompt(context, language)
            else:
                reply = say("I don't have that evidence available. Please discuss it with your usual business contact.", "Mere paas woh proof available nahi hai. Apne known business contact se baat kar lijiye.")
        elif intent == "delivery_request":
            channels = allowed_channels(context)
            channel = next((c for c in channels if c in text.lower() or (c == "email" and matches(text, "ईमेल|मेल")) or (c == "whatsapp" and "व्हाट्सएप" in text)), None)
            if channel is None:
                session.pending_question = "delivery_channel"
                reply = self._channel_prompt(context, language)
            else:
                receipt = await act("send_invoice_or_link", {"channel": channel,
                                    "content": "supporting_documents" if session.pending_question == "proof_channel" else "invoice",
                                    "document_ids": context.document_ids if session.pending_question == "proof_channel" else [],
                                    "amount_minor": context.amount_due_minor, "currency": context.currency})
                session.selected_channel, session.pending_question = channel, None
                if receipt.detail_status == "provider_accepted" and receipt.provider_reference:
                    reply = say("I've submitted your invoice summary by email. Delivery is still pending.",
                                "Aapki invoice summary email ke liye submit ho gayi hai. Delivery abhi confirm nahi hui hai.")
                elif receipt.status == "succeeded" and receipt.detail_status == "delivered" and receipt.provider_reference:
                    reply = say("The delivery service confirmed delivery.", "Delivery service ne delivery confirm ki hai.")
                else:
                    reply = say("I couldn't confirm the message was sent.", "Message bheja gaya hai ya nahi, confirm nahi hua.")
        elif intent == "discount":
            reply = say("I can't approve that discount on this call. You can discuss the request with the business.", "Is call par woh discount approve nahi kar sakti. Business se is request par baat kar sakte hain.")
        elif intent == "hardship":
            mandate = context.mandate
            if mandate.allow_installments and mandate.minimum_installment_minor > 0 and mandate.minimum_installment_minor <= context.amount_due_minor and mandate.installment_due_date:
                amount = spoken_money(mandate.minimum_installment_minor, context.currency, language)
                facts = ["mandate.minimum_installment_minor", "mandate.installment_due_date"]
                reply = say(f"One authorized option is {amount} on {mandate.installment_due_date}. Would that be workable?", f"Ek option {amount}, {mandate.installment_due_date} ko hai. Kya yeh possible hai?")
                session.pending_ptp = {"amount_minor": mandate.minimum_installment_minor, "date": mandate.installment_due_date, "currency": context.currency}
                session.pending_question = "offer_acceptance"
            else:
                reply = say("I understand. I don't have an approved installment option; your usual contact can review this.", "Samajh gayi. Mere paas approved installment option nahi hai; aapka known contact review kar sakta hai.")
        elif intent == "tentative":
            session.pending_ptp, session.pending_question = None, None
            reply = say("I won't treat that as a confirmed payment commitment.", "Main ise confirmed payment commitment nahi maanungi.")
        elif intent == "payment_proposal" or (session.pending_question == "ptp_details" and intent == "clarify"):
            amount = parse_explicit_amount(text)
            planned_date = explicit_date(text, self.today())
            if amount is None or planned_date is None:
                session.pending_ptp, session.pending_question = None, "ptp_details"
                reply = say("What exact amount and calendar date are you proposing?", "Aap exact kitna amount aur kaunsi date keh rahe hain?")
            elif amount > context.amount_due_minor or (context.mandate.latest_due_date and planned_date > context.mandate.latest_due_date):
                session.pending_ptp, session.pending_question = None, None
                reply = say("That proposal is outside my authorization. Please discuss it with the business.", "Yeh proposal meri authority ke bahar hai. Business se baat kar lijiye.")
            elif amount < context.amount_due_minor and (not context.mandate.allow_installments or amount < context.mandate.minimum_installment_minor):
                session.pending_ptp, session.pending_question = None, None
                reply = say("I don't have authorization for that partial-payment plan.", "Is partial-payment plan ki permission mere paas nahi hai.")
            else:
                session.pending_ptp = {"amount_minor": amount, "currency": context.currency, "date": planned_date}
                session.pending_question, session.state = "ptp_confirmation", "CONFIRMING_PTP"
                money = spoken_money(amount, context.currency, language)
                reply = say(f"To confirm: {money} on {planned_date}. Do you agree to that payment commitment?", f"Confirm kar loon: {money}, {planned_date} ko. Kya aap is payment commitment se agree karte hain?")
        elif intent == "affirm" and classify_control(text) == "affirm" and session.pending_question in {"ptp_confirmation", "offer_acceptance"} and session.pending_ptp:
            if session.pending_question == "offer_acceptance":
                session.pending_question, session.state = "ptp_confirmation", "CONFIRMING_PTP"
                reply = say(f"Please confirm the commitment: {spoken_money(session.pending_ptp['amount_minor'], context.currency, language)} on {session.pending_ptp['date']}.", f"Commitment confirm kar dijiye: {spoken_money(session.pending_ptp['amount_minor'], context.currency, language)}, {session.pending_ptp['date']} ko.")
            else:
                receipt = await act("record_ptp", session.pending_ptp)
                if receipt.status == "succeeded" and receipt.provider_reference:
                    session.state, session.outcome = "PTP_RECORDED", "promise_to_pay"
                    reply = say("Your payment commitment is recorded. This does not mark the invoice paid.", "Aapka payment commitment record ho gaya hai. Invoice abhi paid mark nahi hua hai.")
                else:
                    session.outcome = "ptp_record_failed"
                    reply = say("I couldn't confirm the commitment was saved. Please confirm it with the business.", "Commitment save hona confirm nahi hua. Business se confirm kar lijiye.")
                session.pending_question, session.pending_ptp = None, None
        elif intent == "deny":
            session.pending_ptp, session.pending_question = None, None
            reply = say("Understood. I won't record a payment commitment.", "Theek hai, main payment commitment record nahi karungi.")
        elif session.pending_question == "availability" and intent in {"affirm", "available"}:
            session.pending_question = None
            reply = say("Thank you. Is there a question or concern about the invoice?", "Shukriya. Invoice ko lekar koi sawaal ya dikkat hai?")
        elif intent == "off_topic":
            reply = say("I can help with this billing follow-up. What would you like to clarify?", "Main is billing follow-up mein help kar sakti hoon. Aap kya clarify karna chahenge?")

        if reply is None:
            reply = say("I didn't fully understand that. Could you explain what you mean?", "Aapki baat poori samajh nahi aayi. Thoda aur bata sakte hain?")

        return TurnResult(session.session_id, event.event_id, event.event_id, reply, language,
                          session.state, session.state_version, intent, end, session.outcome,
                          receipts[-1]["status"] if receipts else None, receipts, fact_refs=facts)

    @staticmethod
    def _channel_prompt(context: InvoiceContext, language: LanguageMode) -> str:
        channels = allowed_channels(context)
        if not channels:
            return localized(language, "I don't have a verified delivery channel. Please contact the business directly.", "Mere paas verified delivery channel nahi hai. Business se direct contact kar lijiye.")
        options = " or ".join(channels) if language == "en-IN" else " ya ".join(channels)
        return localized(language, f"Would you prefer {options}?", f"{options} par bheju?")
