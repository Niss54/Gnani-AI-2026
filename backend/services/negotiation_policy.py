"""Bounded intent and action policy for the corrected baseline.

This is an intentionally conservative baseline, not a trained model or an accuracy
claim. Unknown and ambiguous utterances ask for clarification rather than inventing
a concession, financial fact, or action result.
"""

from __future__ import annotations

import re
from datetime import date, timedelta

from backend.contracts.voice import InvoiceContext, VoiceError


def matches(text: str, pattern: str) -> bool:
    return re.search(pattern, text, re.I) is not None


def classify_control(text: str) -> str | None:
    if not text.strip():
        return "silence"
    if matches(text, r"\b(stop calling|don't call(?: me)? again|do not call(?: me)? again|never call|dobara call mat|call mat kar|call nahi karna)\b|कॉल मत|दोबारा.*मत"):
        return "opt_out"
    if matches(text, r"\b(wrong (number|person)|galat number|not (the|your) (client|customer)|you have the wrong)\b|गलत नंबर"):
        return "wrong_number"
    if matches(text, r"\b(driving|drive kar|hospital|emergency|accident)\b|गाड़ी चला|अस्पताल|इमरजेंसी") and not matches(text, r"\b(not driving|no emergency)\b"):
        return "safety_close"
    if matches(text, r"\b(hang up|end (the )?call|stop talking|bye|goodbye|call end|phone rakho|baat nahi karni|mann? nahi|don't want to (talk|discuss))\b|बात नहीं करनी|फोन रख"):
        return "close"
    if matches(text, r"\b(talk to|speak (to|with)|connect (me|us)|human|person|freelancer se baat|baat karwa|baat kara)\b|बात करवा|इंसान से"):
        if matches(text, r"\b(I('|’)ll|I will|khud|main.*kar (lunga|loonga))\b|खुद"):
            return "direct_contact"
        return "human_request"
    if (matches(text, r"\b(dispute|invoice (is )?(wrong|incorrect)|wrong (amount|balance)|work (is )?(incomplete|bad)|incomplete work|not happy|bug|bugs|kaam (kharab|incomplete)|invoice galat|don't remember|dont remember|not remember|yaad nahi)\b|इनवॉइस गलत|काम अधूरा|डॉन'टी रिमेंबर|याद नहीं")
            and not matches(text, r"\b(no dispute|not disputing|no (issue|bugs))\b")):
        return "dispute"
    if matches(text, r"\b(not busy|not in (a )?meeting|free now|can talk|kar sakta hoon|kar sakte hain|baat kar sakte hain|sun raha|boliye|bataiye|bolo|batao)\b|कर सकता हूँ|कर सकता हूं|कर सकते हैं|बात कर सकते हैं|फ्री हूँ|फ्री हूं|सुन रहा|बोलिए|बताइए|बोलो|बताओ"):
        return "available"
    if matches(text, r"\b(busy|meeting|baad (me|mein|mai)|later|not now|abhi nahi|call (me )?later|talk later|talk to later)\b|बिजी|बाद में|लेटर|अभी नहीं|बाद में कॉल|बाद में बात|इनवॉइस.*लेटर|लेटर.*इनवॉइस|टॉक टू लेटर"):
        return "busy"
    if matches(text, r"\b(do not|don't|dont|mat|nahi)\b.*\b(email|mail|whatsapp|sms)\b|\b(email|mail|whatsapp|sms)\b.*\b(mat|nahi|don't|do not)\b|ईमेल मत|मेल मत"):
        return "channel_refusal"
    if matches(text, r"\b(already paid|payment (is )?done|paid already|pay kar diya|payment kar diya|kar diya|ho gaya payment)\b|पेमेंट कर दिया|भुगतान कर दिया|कर दिया"):
        return "already_paid"
    if matches(text, r"\b(ai|robot|bot|human|artificial intelligence)\b|एआई|रोबोट"):
        return "ai_identity"
    if matches(text, r"\b(trust|believe|scam|fraud|bharosa|kaise maanu|verify)\b|भरोसा|विश्वास"):
        return "trust"
    if matches(text, r"\b(proof|evidence|invoice copy|work details|kya proof|saboot)\b|सबूत"):
        return "proof"
    if matches(text, r"\b(otp|pin|card number|cvv)\b|ओटीपी"):
        return "secrets"
    if matches(text, r"\b(legal|court|lawyer|interest|penalty|lawsuit)\b|कोर्ट|ब्याज|कानूनी"):
        return "legal_boundary"
    if matches(text, r"\b(discount|maaf|waive|waiver)\b|माफ|डिस्काउंट"):
        return "discount"
    if matches(text, r"\b(no money|can't pay|cannot pay|cash flow|cash tight|paise nahi|paisa nahi|installment|instalment|split)\b|पैसे नहीं|किस्त"):
        return "hardship"
    if matches(text, r"\b(maybe|perhaps|cannot commit|can't commit|not a promise|promise nahi|dekhte hain)\b|पक्का नहीं"):
        return "tentative"
    if matches(text, r"\b(email|whatsapp|sms|send (the )?(link|invoice)|link bhej|bhej do|whatsapp pe|mail pe)\b|ईमेल|व्हाट्सएप|लिंक भेज|भेज दो"):
        return "delivery_request"
    if matches(text, r"^(hello|hi|hey|namaste|namaskar)\b|^(हेलो|हैलो|नमस्ते|नमस्कार)[!?. ]*"):
        return "greeting"
    if matches(text, r"\b(who is this|who is calling|who are you|kaun bol raha hai|kaun hai|kiska call hai|kis baare mein)\b|कौन बोल रहा|कौन है"):
        return "ai_identity"
    if matches(text, r"\b(repeat|play again|say again|once again|pardon|dobara bolo|phir se bolo|phir se boliye|kya kaha|kya bola|aw?aaz? (nahi|ni) (aayi|aa rahi|aarahi)|aw?aaz? (cut|kat|break)|sunai nahi diya|not audible|can't hear|cannot hear|inaudible|break ho rahi|voice cut)\b|दोबारा बोल|फिर से बोल|प्ले अगेन|सुनाई नहीं|ऑडिबल|नॉट ऑडिबल|आवाज़ नहीं|आवाज नहीं|आवाज कट"):
        return "repeat"
    if matches(text, r"\b(agenda|purpose|motive|kis liye call|call kyun kiya|call karne ka (reason|agenda|purpose|matlab)|what is the agenda|what are you saying)\b|एजेंडा|मकसद|किस लिए कॉल"):
        return "agenda"
    if matches(text, r"\b(kyun|kyu|why|kis baat|kiska (bill|invoice|paise)|kis cheez|par kyun)\b|क्यों|किस बात|किसका इनवॉइस|पर क्यों"):
        return "clarify"
    if matches(text, r"\b(will pay|pay tomorrow|pay on|pay today|pay kar|kar dunga|de dunga|payment.*(today|tomorrow))\b|पे कर|दे दूंगा|भुगतान.*कर"):
        return "payment_proposal"
    if matches(text, r"^(yes|yeah|yep|yup|haan|han|ha|ji|ji haan|ji han|theek hai|thik hai|okay|ok|sure|correct|speaking|yes speaking|boliye|bataiye|what next|next|main bol raha hoon|bol raha hoon|i can hear you)\b"
                     r"|^(यस|एस|ओके|श्योर|करेक्ट|हाँ|हां|जी|जी हां|जी हाँ|हाँ जी|हां जी|ठीक है|सही है|बोलिए|बताइए|बोल रहा हूँ|बोल रहा हूं|हाँ बोलिए|जी बोलिए|व्हाट नेक्स्ट|आगे बोलो|नेक्स्ट|आगे बताओ)"
                     r"|\b(yes speaking|speaking|i am|this is|main hi hoon|main hoon|what next|can hear you|hear you)\b"
                     r"|(स्पीकिंग|आई एम|दिस इस|कैन हियर यू|सुन पा रहा|सुन रहा|बात कर रहा हूँ|बोल रहा हूँ|बात कर रहा हूं|बोल रहा हूं|यस सर|यस मैम)"):
        return "affirm"
    if matches(text, r"^(no|nope|nahi|nahin|nhi|galat|wrong)[.! ]*$|^(नो|नहीं|ना|गलत)[.! ]*$|\b(not me|main nahi hoon|wrong person)\b"):
        return "deny"
    return None


def assert_context_authorized(context: InvoiceContext, tenant_id: str) -> None:
    if context.tenant_id != tenant_id:
        raise VoiceError("forbidden", "Context belongs to another tenant")
    if not context.mandate.authorized or not context.mandate.version:
        raise VoiceError("policy_rejected", "No current creditor mandate")
    if context.mandate.contact_blocked:
        raise VoiceError("contact_blocked", "Contact is suppressed")


def allowed_channels(context: InvoiceContext) -> list[str]:
    return [channel for channel in context.mandate.allowed_channels if channel in context.verified_channels]


def explicit_date(text: str, today: date) -> str | None:
    iso_dates = re.findall(r"\b\d{4}-\d{2}-\d{2}\b", text)
    if len(iso_dates) == 1:
        try:
            parsed = date.fromisoformat(iso_dates[0])
            return parsed.isoformat() if parsed >= today else None
        except ValueError:
            return None
    if re.search(r"\btomorrow\b", text, re.I):
        return (today + timedelta(days=1)).isoformat()
    if re.search(r"\btoday\b|\baaj\b|आज", text, re.I):
        return today.isoformat()
    # kal and next Friday deliberately require an exact date.
    return None
