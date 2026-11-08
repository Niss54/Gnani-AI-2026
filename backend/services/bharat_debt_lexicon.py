"""Bharat Vernacular Debt Lexicon (BVDL) — Indic Commercial Debt Recovery Idiom Mapper.

Inspired by Bharat Jargons and Indic sovereign domain mapping.
Maps regional Hindi, Hinglish, Bengali, Marathi, and Gujarati colloquial debtor idioms
to structured statutory recovery concepts under MSMED Act 2006, Section 43B(h), and
Negotiable Instruments Act Section 138.
Ensures zero misinterpretation by Gnani AI Evon/Prisma and provides statutory grounding.
"""

from __future__ import annotations

import re
from typing import Any

# Vernacular dictionary mapping colloquial debtor excuses/phrases to statutory concepts & strategies
VERNACULAR_DEBT_MAP: dict[str, dict[str, Any]] = {
    "paisa fas gaya": {
        "clinical_concept": "Counterparty Liquidity Bottleneck / Working Capital Blockage",
        "category": "cash_flow",
        "risk_level": "medium",
        "statutory_reference": "MSMED Act 2006 Section 15 (45-Day Statutory Mandatory Payment)",
        "agent_strategy": "Acknowledge industry liquidity cycles. Offer 50/50 split settlement with 14-day formal grace period under PTP protocol.",
        "standard_hindi": "बाजार में पैसा फंसा हुआ है / नकदी प्रवाह में अस्थायी रुकावट",
    },
    "baad me dekh lenge": {
        "clinical_concept": "Evasive Posture / Intentional Delay of Statutory Dues",
        "category": "evasive",
        "risk_level": "high",
        "statutory_reference": "Income Tax Act Section 43B(h) Disallowance & MSMED Section 16 Penal Interest",
        "agent_strategy": "Firmly remind that overdue payables after 45 days lose income tax deduction benefits and accrue 3x RBI compound penal interest with monthly rests.",
        "standard_hindi": "बाद में बात करेंगे / टालमटोल की स्थिति",
    },
    "hisaab me gadbad hai": {
        "clinical_concept": "Invoice Dispute / Reconciliation Variance",
        "category": "dispute",
        "risk_level": "medium",
        "statutory_reference": "MSMED Act Section 15 Proviso (15-Day Objection Window)",
        "agent_strategy": "Trigger Dispute Circuit Breaker. Freeze compound interest accrual for 48 hours and dispatch itemized statement of accounts via WhatsApp/email.",
        "standard_hindi": "बिल या खाते के मिलान में मतभेद",
    },
    "party ne payment roki hai": {
        "clinical_concept": "Downstream Buyer Delay Defense (Third-Party Contingency)",
        "category": "third_party_dependency",
        "risk_level": "medium",
        "statutory_reference": "MSMED Act Section 16 Strict Buyer Liability",
        "agent_strategy": "Clarify that MSMED Act mandates buyer liability independent of downstream client realization. Propose immediate token payment via Razorpay.",
        "standard_hindi": "आगे की पार्टी से भुगतान रुका हुआ है",
    },
    "thoda discount kar do": {
        "clinical_concept": "Principal Haircut / Statutory Waiver Request",
        "category": "settlement",
        "risk_level": "low",
        "statutory_reference": "MSMED Act Section 16 (Statutory Interest is Non-Waivable by Mutual Agreement)",
        "agent_strategy": "Explain statutory interest is legally mandated, but offer to waive late penalty fees if 100% principal is cleared within 7 calendar days via Razorpay.",
        "standard_hindi": "ब्याज या मूलधन में छूट की मांग",
    },
    "agle mahine clear karenge": {
        "clinical_concept": "Promise to Pay (PTP) Future Month Request",
        "category": "promise_to_pay",
        "risk_level": "medium",
        "statutory_reference": "MSMED Mandatory 45-Day Overdue Ceiling",
        "agent_strategy": "Capture specific commitment date, generate digital PTP audit voucher, and require 25% upfront token commitment via instant payment link.",
        "standard_hindi": "अगले महीने पूरा भुगतान करने का वादा",
    },
    "cheque laga diya hai": {
        "clinical_concept": "Instrument in Clearing / Cheque Payment",
        "category": "clearing",
        "risk_level": "low",
        "statutory_reference": "Negotiable Instruments Act 1881 Section 138 Notice Warning",
        "agent_strategy": "Request 6-digit cheque number and drawee bank name. Remind of Section 138 dishonor provisions and offer instant UPI/Razorpay alternate.",
        "standard_hindi": "चेक बैंक में जमा कर दिया गया है",
    },
    "gst ka chakkar hai": {
        "clinical_concept": "Input Tax Credit (ITC) / GSTR-2B Mismatch",
        "category": "compliance",
        "risk_level": "medium",
        "statutory_reference": "GST Act 2017 & Section 43B(h) Synchronization",
        "agent_strategy": "Confirm GSTR-1 filing status. Offer instant digital credit note reconciliation to unblock immediate payment.",
        "standard_hindi": "जीएसटी इनपुट टैक्स क्रेडिट मिलान का मामला",
    },
    "sirf 10 din ka time do": {
        "clinical_concept": "Short-Term Extension / Moratorium Window",
        "category": "grace_period",
        "risk_level": "low",
        "statutory_reference": "Promise to Pay (PTP) Standard 14-Day Settlement Protocol",
        "agent_strategy": "Approve 10-day extension subject to 50% downpayment today via Razorpay, formalizing balance on day 10.",
        "standard_hindi": "१० दिन की मोहलत की मांग",
    },
    "court me milenge": {
        "clinical_concept": "Litigation Escalation / Hostile Legal Stance",
        "category": "escalation",
        "risk_level": "critical",
        "statutory_reference": "MSMED Act Section 18 Samadhaan MSEFC Arbitration & Summary Enforcement",
        "agent_strategy": "De-escalate respectfully. Inform that MSEFC statutory arbitration is expedited (90-day decree) and 75% pre-deposit is mandatory for appeal.",
        "standard_hindi": "कानूनी विवाद या अदालत जाने की चेतावनी",
    },
    "manager approve karega": {
        "clinical_concept": "Internal Sign-off Dependency / Hierarchy Bureaucracy",
        "category": "internal_approval",
        "risk_level": "low",
        "statutory_reference": "MSMED Section 15 Mandatory Corporate Compliance",
        "agent_strategy": "Offer to dispatch digital sign-off reconciliation packet directly to finance manager email and schedule 24-hour verification callback.",
        "standard_hindi": "मैनेजर या डायरेक्टर की मंजूरी का इंतजार",
    },
    "kal tak pakka ho jayega": {
        "clinical_concept": "Immediate Next-Day PTP Commitment",
        "category": "promise_to_pay",
        "risk_level": "low",
        "statutory_reference": "PTP Digital Audit Verification Protocol",
        "agent_strategy": "Lock in specific time of day for payment realization and send Razorpay direct link via WhatsApp immediately.",
        "standard_hindi": "कल तक भुगतान करने का पक्का भरोसा",
    },
}


def is_negated_phrase(text: str, matched_span: tuple[int, int]) -> bool:
    """Check if the matched debtor phrase is preceded or followed by negation or resolution markers.
    
    Prevents false alarms (e.g., 'hisaab me koi gadbad nahi hai' should not trigger an invoice dispute).
    """
    start, end = matched_span
    pre = text[max(0, start - 40) : start].lower()
    post = text[end : min(len(text), end + 80)].lower()

    # Preceding double-negation override
    if re.search(r"\b(not\s+not|never\s+not|not\s+without|no\s+doubt)\b", pre):
        return False

    # Preceding negation: "no", "not", "without", "koi nahi", "kisi bhi tarah ka"
    if re.search(
        r"\b(no|not|without|denies|neither|don'?t have|doesn'?t have|never had|free from|koi|kisi bhi tarah ka)\s*(any|such|bhi)?\s*$",
        pre,
    ):
        return True

    # Succeeding clause-bounded negation check
    clause_parts = re.split(
        r"[,.;?!]|\b(lekin|par|magar|kintu|parantu|aur|and|but|however|although)\b",
        post,
        maxsplit=1,
    )
    clause_post = clause_parts[0]
    words = clause_post.strip().split()[:8]
    window = " ".join(words)

    if re.search(
        r"\b(nahi|nahin|na\s+(ho|raha|rahi|tha|thi)|not|negative|absent|denied|ruled\s+out|no\s+more|bilkul\s+nahi|koi\s+nahi|theek|thik|normal|bacha\s+nahi|khatam|resolved|gone|नहीं|ना\s+(हो|रहा|रही)|ठीक|गायब|खत्म|आराम)\b",
        window,
    ):
        return True

    return False


def analyze_debtor_idiom(text: str) -> list[dict[str, Any]]:
    """Scan borrower/debtor statement for vernacular Hindi/Hinglish debt idioms.

    Returns matched debt recovery concepts with statutory guidance and risk level.
    Negated statements are filtered out to eliminate false positives.
    """
    clean_text = text.lower().strip()
    matches: list[dict[str, Any]] = []

    for idiom, details in VERNACULAR_DEBT_MAP.items():
        pattern = re.compile(r"\b" + re.escape(idiom) + r"\b", re.IGNORECASE)
        for m in pattern.finditer(clean_text):
            if not is_negated_phrase(clean_text, m.span()):
                matches.append({"matched_idiom": idiom, **details})
                break

    return matches


def enrich_debt_prompt_with_lexicon(debtor_text: str) -> str:
    """Inject statutory recovery awareness into LLM system prompt if vernacular idioms are found."""
    detected = analyze_debtor_idiom(debtor_text)
    if not detected:
        return ""

    context_lines = [
        "\n[Bharat Vernacular Debt Recovery Intelligence]:"
    ]
    for item in detected:
        context_lines.append(
            f"- Debtor Phrase: '{item['matched_idiom']}'"
            f"\n  Concept: {item['clinical_concept']} (Risk: {item['risk_level'].upper()})"
            f"\n  Statutory Anchor: {item['statutory_reference']}"
            f"\n  Actionable Protocol: {item['agent_strategy']}"
        )

    return "\n".join(context_lines)
