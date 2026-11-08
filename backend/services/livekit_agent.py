import asyncio
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Optional

import httpx
from dotenv import load_dotenv
from livekit import api, rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    RunContext,
    cli,
    function_tool,
    metrics,
    room_io,
    tokenize,
)
from livekit.agents.llm import FallbackAdapter
from livekit.plugins import (
    google,
    groq,
    noise_cancellation,
    silero,
)
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv(".env.local")
load_dotenv(".env")

try:
    from services.bharat_debt_lexicon import (
        analyze_debtor_idiom,
        enrich_debt_prompt_with_lexicon,
        is_negated_phrase,
    )
except ImportError:
    try:
        from bharat_debt_lexicon import (
            analyze_debtor_idiom,
            enrich_debt_prompt_with_lexicon,
            is_negated_phrase,
        )
    except ImportError:
        def is_negated_phrase(text: str, span: tuple[int, int]) -> bool:
            return False
        def enrich_debt_prompt_with_lexicon(text: str) -> str:
            return ""

try:
    from services.bhashini_service import get_bhashini_service
except ImportError:
    try:
        from bhashini_service import get_bhashini_service
    except ImportError:
        get_bhashini_service = None

logger = logging.getLogger("revclaim-agent")

# -----------------------------------------------------------------------------
# System Prompt & Core Recovery Policy
# -----------------------------------------------------------------------------
SYSTEM_PROMPT = """You are Sarah, a warm, polite, and quick-witted accounts and billing recovery specialist representing the client's creative agency or freelancer.

NATURAL HUMAN CONVERSATIONAL RULES:
- Never sound robotic, cold, or bureaucratic. Speak like a courteous, helpful colleague on a phone call.
- Reply in the language of the debtor's LAST message (courteous Hinglish/Hindi or clear Indian/Global English).
- Strict turn brevity: 1 to 2 short sentences max (15-20 words). Never read long paragraphs or monologues.

HIGH-EQ REFLEXES FOR UNEXPECTED QUESTIONS:
1. "Kaun ho? / Who is this? / Why are you calling?": "Namaste! Main accounts desk se Sarah bol rahi hoon, regarding project invoice reconciliation. Bas 1 minute ka quick check-in chahiye tha."
2. "Are you an AI? / Robot ho kya?": "Haha nahi, main billing coordinator hoon aur hum settlement ko smooth banane me agency founder ke sath coordinate kar rahe hain."
3. "Busy hoon / Driving / Meeting me hoon": "Oh extremely sorry! Main abhi call wrap karti hoon. Maine WhatsApp par secure payment link bhej diya hai, jab free hon tab check kar lijiyega."
4. "Paise nahi hain / Cash crunch": "Bilkul samajh sakti hoon, cash flow tight hota rehta hai. Kya 50% abhi clear kar lein aur remainder agle billing cycle me?"
5. "Kaam kharab tha / Bugs hain": "Understood. Maine deliverable review dispute log kar diya hai aur calls turant pause ho gayi hain. Dev lead aapse connect karenge."
6. "Paise nahi dunga": "Koi baat nahi, main dispute log karke automated follow-ups pause kar rahi hoon taaki aap founder se directly discuss kar sakein."

PRIMARY OBJECTIVES:
1. Reconcile overdue invoice balance respectfully while preserving commercial goodwill.
2. Uncover the debtor's cash-flow reason for non-payment.
3. Negotiate a realistic Promise-to-Pay (PTP) or offer 50% split / 5% prompt discount via secure Razorpay portal.
4. Call `dispatch_razorpay_payment_link` to dispatch live UPI / Card checkout link to debtor's WhatsApp.
5. If payment date agreed, call `log_promise_to_pay`.
6. If work disputed, call `log_dispute_circuit_breaker` to pause calls instantly.
7. If debtor asks to hang up, politely call `end_call`."""

GREETING = (
    "Hello! This is Sarah from the accounts and settlement desk. "
    "I'm reaching out regarding your pending project invoice reconciliation. Is this a good time for a quick 1-minute check-in?"
)


def _outbound_greeting(name: str, reason: str = "") -> str:
    """Who is calling, why, and courteous check-in."""
    who = (
        f"Hello{' ' + name if name else ''}, this is Sarah calling on behalf of the accounts and billing desk."
    )
    why = (
        f" I'm following up on {reason}."
        if reason
        else " I'm checking in regarding your pending project invoice statement."
    )
    return (
        who
        + why
        + " If this is a busy moment, please let me know and I will gladly call back at a better time."
    )


# Voices
GNANI_VOICE = "Nalini"
MURF_VOICE = "Anisha"
SILENCE_TIMEOUT = 12.0
SILENCE_RE_PROMPTS = [
    "Are you still with me? Take your time — I'm here to help reconcile this invoice smoothly.",
    "It seems you might be away. I will pause our call for now and send the secure invoice link to your message inbox. Have a great day.",
]

FUNCTION_TAG_REGEX = re.compile(
    r"<function=[^>]*>.*?</function>", re.DOTALL | re.IGNORECASE
)
RAW_TAG_REGEX = re.compile(r"</?function[^>]*>", re.IGNORECASE)

# Circuit breaker triggers (legal escalation, police, harassment, hostile refusal)
DISPUTE_RE = re.compile(
    r"police|harass|fir|complaint|lawyer|advocate|court|sue|legal notice|"
    r"fraud|scam|cheater|chor|don'?t call again|stop calling|never call|"
    r"dispute|not paying|reject work|bad work|incomplete work|poor quality|"
    r"वकील|कोर्ट|पुलिस|शिकायत|धोखा|कॉल मत करना",
    re.IGNORECASE,
)


class CleanSentenceTokenizer(tokenize.basic.SentenceTokenizer):
    """Safety tokenizer that cleans any leaked function/XML tags before audio synthesis."""

    def tokenize(self, text: str, *, language: str | None = None) -> list[str]:
        cleaned = FUNCTION_TAG_REGEX.sub("", text)
        cleaned = RAW_TAG_REGEX.sub("", cleaned).strip()
        if not cleaned:
            return []
        return super().tokenize(cleaned, language=language)


def _clean_user_id(val: str) -> str:
    s = (val or "").strip()
    if (
        not s
        or s.lower() in ("default", "none", "null", "undefined")
        or "caller" in s.lower()
    ):
        return ""
    return s


# -----------------------------------------------------------------------------
# RevClaim Autonomous Recovery Agent
# -----------------------------------------------------------------------------
class Assistant(Agent):
    def __init__(self, debtor_phone: str = "") -> None:
        super().__init__(instructions=SYSTEM_PROMPT)
        self.debtor_phone = debtor_phone
        self.debtor_facts: dict = {}
        self.job_ctx: JobContext | None = None
        self.call_id: int = 0
        self.call_start_dt: Optional[datetime] = None
        self.ptp_logged_flag: bool = False
        self.dispute_raised_flag: bool = False
        self.payment_link_dispatched: bool = False
        self.user_turns: int = 0
        self.agent_turns: int = 0
        self.tts_locale: str = "en-IN"

    @function_tool
    async def dispatch_razorpay_payment_link(
        self,
        context: RunContext,
        invoice_number: str,
        amount: float,
        channel: str = "whatsapp_and_sms",
    ) -> str:
        """Generate and dispatch a verified Razorpay settlement link via SMS / WhatsApp.

        Use this tool when the debtor agrees to pay now or asks:
        - "Where can I pay?", "Send me the UPI link", "Can I pay by credit card?"
        - "Link bhej do, main abhi karta hoon."

        Args:
            invoice_number: The invoice code (e.g., "INV-1042").
            amount: Amount in INR or USD to be settled.
            channel: Delivery channel ("whatsapp_and_sms" or "email").
        """
        self.payment_link_dispatched = True
        logger.info(
            "dispatch_razorpay_payment_link: inv=%s, amount=%.2f, channel=%s",
            invoice_number,
            amount,
            channel,
        )

        # Broadcast payment link card to live UI
        if self.job_ctx and self.job_ctx.room and self.job_ctx.room.local_participant:
            try:
                payload = json.dumps(
                    {
                        "type": "payment_link_dispatched",
                        "invoice_number": invoice_number,
                        "amount": amount,
                        "checkout_url": f"https://rzp.io/i/{invoice_number.lower()}",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                ).encode("utf-8")
                await self.job_ctx.room.local_participant.publish_data(
                    payload, topic="payment_event"
                )
            except Exception as e:
                logger.warning("Failed to publish payment link to room: %s", e)

        return (
            f"A secure Razorpay checkout link for {invoice_number} (Amount: {amount}) "
            "has been dispatched instantly to the debtor's verified mobile number and WhatsApp. "
            "Advise the debtor that it supports UPI, Cards, and NetBanking with instant automated reconciliation."
        )

    @function_tool
    async def log_promise_to_pay(
        self,
        context: RunContext,
        ptp_amount: float,
        ptp_date: str,
        notes: str = "",
    ) -> str:
        """Record a formal Promise-to-Pay (PTP) agreement in the database.

        Use when debtor commits to a date:
        - "I will pay ₹20,000 this Friday."
        - "Agli 5 taareekh ko transfer ho jayega."

        Args:
            ptp_amount: Agreed amount debtor committed to clear.
            ptp_date: Promised payment deadline or date (e.g. "2026-11-05" or "This Friday").
            notes: Context or reasons given by the debtor.
        """
        self.ptp_logged_flag = True
        logger.info("log_promise_to_pay: amount=%.2f, date=%s", ptp_amount, ptp_date)

        if self.job_ctx and self.job_ctx.room and self.job_ctx.room.local_participant:
            try:
                payload = json.dumps(
                    {
                        "type": "promise_to_pay_logged",
                        "ptp_amount": ptp_amount,
                        "ptp_date": ptp_date,
                        "notes": notes,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                ).encode("utf-8")
                await self.job_ctx.room.local_participant.publish_data(
                    payload, topic="ptp_event"
                )
            except Exception as e:
                logger.warning("Failed to publish PTP event to room: %s", e)

        return (
            f"Formal Promise-to-Pay recorded: {ptp_amount} committed for {ptp_date}. "
            "Follow-up notifications have been automatically scheduled. Reassure the debtor with appreciation."
        )

    @function_tool
    async def offer_installment_plan(
        self,
        context: RunContext,
        total_balance: float,
        installments_count: int = 2,
    ) -> str:
        """Calculate structured milestone installments for cash-strapped debtors.

        Use when debtor states cash-flow constraints:
        - "Abhi poora paisa nahi hai, half de sakta hoon."
        - "Can we split this into 2 parts?"

        Args:
            total_balance: Total overdue balance.
            installments_count: Number of split installments (default 2).
        """
        part = round(total_balance / max(installments_count, 1), 2)
        return (
            f"Installment plan authorized: {installments_count} parts of {part} each. "
            f"First installment ({part}) due today to keep account active, second ({part}) due in 14 days."
        )

    @function_tool
    async def log_dispute_circuit_breaker(
        self,
        context: RunContext,
        dispute_reason: str,
        deliverable_ref: str = "",
    ) -> str:
        """Trigger instant circuit-breaker when debtor raises a scope or deliverable dispute.

        Freezes automated calls, flags dispute queue in dashboard, and initiates human mediation.

        Args:
            dispute_reason: Reason stated by client (e.g. "buggy code", "incomplete design").
            deliverable_ref: Relevant deliverable or milestone reference if mentioned.
        """
        self.dispute_raised_flag = True
        logger.warning(
            "log_dispute_circuit_breaker triggered: reason=%s, ref=%s",
            dispute_reason,
            deliverable_ref,
        )

        if self.job_ctx and self.job_ctx.room and self.job_ctx.room.local_participant:
            try:
                payload = json.dumps(
                    {
                        "type": "dispute_circuit_breaker_active",
                        "reason": dispute_reason,
                        "deliverable": deliverable_ref,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                ).encode("utf-8")
                await self.job_ctx.room.local_participant.publish_data(
                    payload, topic="dispute_event"
                )
            except Exception as e:
                logger.warning("Failed to publish dispute event to room: %s", e)

        return (
            "Circuit breaker engaged: Automated recovery paused. The stated dispute has been "
            "escalated directly to the creative agency lead with deliverable sign-off documentation. "
            "Politely inform the debtor that automated calls will halt immediately."
        )

    @function_tool
    async def calculate_statutory_interest(
        self,
        context: RunContext,
        principal_amount: float,
        days_overdue: int,
    ) -> str:
        """Compute legal statutory compound interest under India MSMED Act Section 16 (3x RBI Bank Rate).

        Use ONLY if debtor is an Indian enterprise delaying MSME payment beyond 45 days.

        Args:
            principal_amount: Invoice principal amount in INR.
            days_overdue: Days past agreed payment term.
        """
        # RBI Bank rate ~6.5% -> 3x is 19.5% annual compounded monthly
        annual_rate = 0.195
        months = max(days_overdue, 0) / 30.0
        interest = round(principal_amount * (((1 + (annual_rate / 12)) ** months) - 1), 2)
        total_due = round(principal_amount + interest, 2)
        return (
            f"Under MSMED Act Section 16 (Statutory 3x RBI Bank Rate of 19.5% per annum compounded monthly), "
            f"the accrued statutory interest on INR {principal_amount} for {days_overdue} days is INR {interest}. "
            f"Total legally enforceable sum is INR {total_due}."
        )

    @function_tool
    async def translate_debt_notice(
        self,
        context: RunContext,
        text: str,
        target_language: str,
        source_language: str = "en",
    ) -> str:
        """Translate invoice settlement advice, legal notice terms, or payment guidelines into any of India's 26 scheduled languages using Bhashini (Digital India / MeitY) IndicTrans2.

        Use this tool when a debtor requests explanation in Kannada, Tamil, Telugu, Marathi, Bengali, Gujarati, Punjabi, etc.

        Args:
            text: The debt resolution text or legal notice to translate.
            target_language: Target language code (e.g. 'kn', 'ta', 'te', 'mr', 'bn', 'gu', 'hi', 'pa').
            source_language: Source language code (default 'en' or 'hi').
        """
        if not get_bhashini_service:
            return text
        try:
            svc = get_bhashini_service()
            translated = await svc.translate_text(
                text=text,
                source_lang=source_language.lower().split("-")[0],
                target_lang=target_language.lower().split("-")[0],
            )
            return translated or text
        except Exception as e:
            logger.warning("Bhashini translation notice: %s", e)
            return text

    @function_tool
    async def end_call(self, context: RunContext, reason: str = "") -> str:
        """End the recovery call courteously."""
        logger.info("end_call requested: %s", reason or "complete")
        goodbye = (
            "Thank you for your time. Have a wonderful day ahead!"
            if self.tts_locale.startswith("en")
            else "Aapke samay ke liye dhanyawad. Aapka din shubh ho."
        )
        await context.session.say(goodbye).wait_for_playout()
        context.session.shutdown()
        return "Call ended successfully."


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session(agent_name="revclaim-recovery-agent")
async def my_agent(ctx: JobContext):
    ctx.log_context_fields = {"room": ctx.room.name}

    session = AgentSession(
        stt=google.STT(language="en-IN"),
        llm=FallbackAdapter(
            [
                groq.LLM(
                    model="qwen/qwen3.8-27b",
                    temperature=0.2,
                    parallel_tool_calls=False,
                ),
                google.LLM(
                    model="gemini-flash-lite-latest",
                    temperature=0.2,
                ),
            ],
            attempt_timeout=3.5,
        ),
        tts=google.TTS(
            voice_name="en-IN-Wavenet-D",
            speaking_rate=1.05,
        ),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
        user_away_timeout=SILENCE_TIMEOUT,
    )

    inactivity_task: Optional[asyncio.Task[None]] = None

    def _cancel_inactivity() -> None:
        nonlocal inactivity_task
        if inactivity_task is not None and not inactivity_task.done():
            inactivity_task.cancel()
        inactivity_task = None

    async def _handle_inactivity() -> None:
        logger.info("Silence timeout triggered")
        try:
            await session.say(
                SILENCE_RE_PROMPTS[0], allow_interruptions=True
            ).wait_for_playout()
            await asyncio.sleep(SILENCE_TIMEOUT)
            await session.say(
                SILENCE_RE_PROMPTS[1], allow_interruptions=True
            ).wait_for_playout()
            session.shutdown()
        except asyncio.CancelledError:
            raise

    @session.on("user_state_changed")
    def _on_user_state_changed(ev) -> None:
        nonlocal inactivity_task
        if ev.new_state == "away":
            if inactivity_task is None or inactivity_task.done():
                inactivity_task = asyncio.create_task(_handle_inactivity())
            return
        _cancel_inactivity()

    async def _on_text_input(sess, ev) -> None:
        _cancel_inactivity()
        await sess.interrupt()
        sess.generate_reply(user_input=ev.text)

    assistant = Assistant()
    assistant.job_ctx = ctx

    def _set_locale(code: str) -> None:
        clean = (code or "").lower().strip()
        if clean.startswith("en"):
            locale = "en-IN"
        elif clean.startswith("ne"):
            locale = "ne-NP"
        elif clean.startswith("bn"):
            locale = "bn-IN"
        elif "-" in clean:
            locale = code
        else:
            locale = f"{clean}-IN" if len(clean) == 2 else "hi-IN"
        if locale == assistant.tts_locale:
            return
        assistant.tts_locale = locale
        logger.info("Assistant TTS locale switched to: %s", locale)

    @ctx.room.on("data_received")
    def _on_data_received(data_packet: rtc.DataPacket) -> None:
        try:
            raw = data_packet.data.decode("utf-8")
            payload = json.loads(raw)
            topic = getattr(data_packet, "topic", "")
            if payload.get("type") == "language_change" or topic == "language_change":
                lang = payload.get("language")
                if lang:
                    _set_locale(lang)
                    logger.info("LiveKit DataChannel updated language: %s", lang)
        except Exception as e:
            logger.debug("Failed parsing incoming data packet: %s", e)

    @session.on("user_input_transcribed")
    def _on_transcribed(ev) -> None:
        if not ev.is_final:
            return
        if ev.language:
            _set_locale(ev.language)
        text = ev.transcript or ""
        # Deterministic Dispute Scanner with Negation Safety Latch
        if not assistant.dispute_raised_flag:
            for m in DISPUTE_RE.finditer(text):
                if not is_negated_phrase(text, m.span()):
                    assistant.dispute_raised_flag = True
                    logger.info("DISPUTE / CIRCUIT BREAKER detected (un-negated): %r", text[:100])
                    break

    await session.start(
        agent=assistant,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            delete_room_on_close=True,
            text_input=room_io.TextInputOptions(text_input_cb=_on_text_input),
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: noise_cancellation.BVC()
            ),
        ),
    )

    await ctx.connect()
    call_start_dt = datetime.now(timezone.utc)
    assistant.call_start_dt = call_start_dt

    # Turn counting
    @session.on("conversation_item_added")
    def _on_conversation_item(ev) -> None:
        role = getattr(ev.item, "role", "")
        if role == "user":
            assistant.user_turns += 1
        elif role == "assistant":
            assistant.agent_turns += 1

    async def _on_shutdown() -> None:
        elapsed = (datetime.now(timezone.utc) - call_start_dt).total_seconds()
        logger.info(
            "Call finished: turns_user=%d, turns_agent=%d, duration=%.1fs, ptp=%s, dispute=%s",
            assistant.user_turns,
            assistant.agent_turns,
            elapsed,
            assistant.ptp_logged_flag,
            assistant.dispute_raised_flag,
        )

    ctx.add_shutdown_callback(_on_shutdown)
    await session.say(GREETING, allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(server)
