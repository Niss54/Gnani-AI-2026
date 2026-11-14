"""RevClaim AI — Negotiation Intelligence Engine.

Synthesizes foundational negotiation frameworks and academic datasets:
1. Chris Voss ("Never Split the Difference" - FBI Hostage Negotiation):
   - Mirroring, Emotional Labeling, Calibrated Questions, Ackerman Bargaining, Accusation Audits.
2. Fisher & Ury ("Getting to Yes" - Harvard Negotiation Project):
   - Principled negotiation, separating people from problems, objective criteria (GST/MSMED), BATNA.
3. Patterson et al. ("Crucial Conversations"):
   - Contrasting statements, safety restoration, de-escalation of defensive/hostile debtors.
4. Academic Negotiation Research (CaSiNo, CraigslistBargain, DealOrNoDeal):
   - Structured multi-turn negotiation dialogue acts and state transitions.
"""

from __future__ import annotations

from typing import Any

# ==============================================================================
# 1. CHRIS VOSS ("NEVER SPLIT THE DIFFERENCE") TACTICS
# ==============================================================================

CHRIS_VOSS_TACTICS = {
    "emotional_labeling": {
        "cash_flow_stress": {
            "en": "It sounds like cash flow timing is creating significant pressure right now.",
            "hi-en": "Aisa lag raha hai ki is mahine cash flow timing ki wajah se kaafi pressure hai.",
        },
        "deliverable_frustration": {
            "en": "It seems like you feel the delivered work did not match the agreed expectations.",
            "hi-en": "Lagta hai aapko lag raha hai ki delivered kaam aapke agreed expectations ke mutabiq nahi tha.",
        },
        "collection_irritation": {
            "en": "It sounds like you feel caught off-guard and frustrated by these billing follow-ups.",
            "hi-en": "Aisa lag raha hai ki lagatar follow-up calls se aap thoda frustrated mehsoos kar rahe hain.",
        },
        "feeling_unheard": {
            "en": "It sounds like your perspective hasn't been properly acknowledged by the team.",
            "hi-en": "Lagta hai vendor team ne aapki baat ko theek se dhyan se nahi suna hai.",
        },
        "surprise_invoice": {
            "en": "It seems like this billing statement came as an unexpected surprise.",
            "hi-en": "Aisa lagta hai yeh invoice aapke liye bilkul unexpected aur surprising tha.",
        },
    },
    "mirroring_stems": {
        "en": [
            "Cash is tight...?",
            "Deliverables had issues...?",
            "Paid last week...?",
            "Wrong invoice amount...?",
            "Need more time...?",
        ],
        "hi-en": [
            "Cash flow tight hai...?",
            "Kaam mein issues the...?",
            "Pichle hafte pay kiya...?",
            "Amount galat hai...?",
            "Thoda aur time chahiye...?",
        ],
    },
    "calibrated_questions": {
        "explore_feasibility": {
            "en": "How can we structure this outstanding balance so it works with your current operational cash flow?",
            "hi-en": "Hum is balance ko kaise structure karein taaki aapke current cash flow par zyada bojh na pade?",
        },
        "overcome_blocker": {
            "en": "What is the primary obstacle preventing you from settling this balance this week?",
            "hi-en": "Aapke according sabse bada reason kya hai jiski wajah se yeh payment is hafte clear nahi ho pa rahi?",
        },
        "protect_credit": {
            "en": "How would you like to proceed so that your vendor relationship and commercial credit record remain protected?",
            "hi-en": "Aap isme kaise aage badhna chahenge taaki aapka vendor relationship aur commercial profile clean rahe?",
        },
        "realistic_plan": {
            "en": "What exact milestone or date would make settlement realistic for your finance team?",
            "hi-en": "Aapki accounts team ke hisaab se kaunsi exact date par yeh payment realistically complete ho sakti hai?",
        },
        "solve_dispute": {
            "en": "How are we supposed to reconcile this balance without reviewing the agreed delivery scope together?",
            "hi-en": "Bina delivery scope verify kiye hum is invoice issue ko dono ke liye fair tareeqe se kaise suljhayein?",
        },
    },
    "ackerman_bargaining_ladder": {
        "step_1_anchor": {
            "discount_bps": 0,
            "en": "The authoritative recorded balance is {currency} {amount}. We are requesting settlement of the outstanding invoice.",
            "hi-en": "Authoritative record ke mutabiq total balance {currency} {amount} hai. Hum is invoice ko settle karne ka request kar rahe hain.",
        },
        "step_2_initial_concession": {
            "discount_bps": 500,  # 5%
            "en": "While the mandate requires full settlement, if you can authorize immediate payment via the digital link today, I can apply an authorized 5% early settlement concession.",
            "hi-en": "Waise toh poora balance due hai, lekin agar aap aaj digital link se instant settle karte hain, toh main 5% early settlement concession apply kar sakti hoon.",
        },
        "step_3_final_mandate_cap": {
            "discount_bps": 1000,  # 10% ceiling
            "en": "The absolute maximum concession authorized under our mandate is 10%. If we apply that maximum adjustment right now, can you commit to clearing the adjusted balance by 5 PM today?",
            "hi-en": "Hamaare mandate mein maximum allowed discount 10% hai. Agar main abhi yeh final concession apply kar dun, toh kya aap aaj shaam 5 baje tak ise clear kar denge?",
        },
    },
    "accusation_audit": {
        "en": "You're probably thinking we're just another aggressive agency calling without caring about your business difficulties. I want you to know that's not why I'm reaching out.",
        "hi-en": "Aapko shayad lag raha hoga ki hum bina aapki problem samjhe sirf payment ke liye pressure daal rahe hain. Main clear karna chahti hoon ki hamara maksad sirf ek respectful solution nikalna hai.",
    },
    "no_oriented_questions": {
        "en": [
            "Would it be completely unreasonable to clear 50% today and schedule the remainder for next Friday?",
            "Is it impossible for your accounts department to release an interim token payment this week?",
            "Have you completely given up on reaching an amicable settlement on this invoice?",
        ],
        "hi-en": [
            "Kya yeh bilkul impossible hoga agar hum 50% aaj clear karein aur baaki next Friday?",
            "Kya accounts team ke liye is hafte ek partial token payment release karna bilkul mushkil hoga?",
            "Kya is invoice par ek aamne-saamne baithkar fair settlement nikalna namumkin hai?",
        ],
    },
}

# ==============================================================================
# 2. HARVARD NEGOTIATION PROJECT ("GETTING TO YES") TACTICS
# ==============================================================================

HARVARD_NEGOTIATION_TACTICS = {
    "separate_people_from_problem": {
        "en": "I appreciate your candor about the operational challenges your company is facing. Let's look at the invoice ledger facts together and see how we can resolve this objectively.",
        "hi-en": "Aapne company ki operational problems ko khulkar share kiya, shukriya. Chaliye ledger records ko dekhte hain aur ek objective tareeqe se is balance ko solve karte hain.",
    },
    "objective_criteria": {
        "gst_compliance": {
            "en": "The GST input tax credit (ITC) for this invoice has already been filed on GSTR-1 and reflected in GSTR-2B. Settle the balance to ensure compliance remains flawless.",
            "hi-en": "Is invoice ka GST input credit GSTR-1 mein file ho chuka hai aur GSTR-2B par reflect kar raha hai. Payment clear hone par aapka tax audit clean rahega.",
        },
        "signed_acceptance": {
            "en": "Our records show a formal sign-off email acknowledging receipt of the project deliverables on the recorded date.",
            "hi-en": "Hamaare records mein delivery date par project deliverables ka formal sign-off email recorded hai.",
        },
        "msmed_statutory_framework": {
            "en": "Under MSMED Act Section 15 and 16, invoices beyond the 45-day statutory window accumulate compound penal interest at three times the RBI bank rate.",
            "hi-en": "MSMED Act Section 15 aur 16 ke mutabiq 45 days se zyada overdue par RBI ke 3x compound interest ka statutory provision apply hota hai.",
        },
    },
    "batna_framing": {
        "en": "Reaching an agreed installment schedule today avoids escalating this file to third-party commercial arbitration or credit bureau reporting.",
        "hi-en": "Aaj aapsi samjhoute se installment plan tay karne se yeh matter formal arbitration ya credit reporting par escalate hone se bach jayega.",
    },
    "mutual_gain_options": {
        "split_milestone": {
            "en": "Option A: 50% upfront via payment link today, and remaining 50% automatically scheduled 14 days later.",
            "hi-en": "Option A: 50% payment aaj link se, aur baaki 50% agle 14 din baad scheduled installment mein.",
        },
        "interest_waiver": {
            "en": "Option B: Settle the principal balance in full by this Friday, and we will waive all accrued late administrative fees.",
            "hi-en": "Option B: Agar Friday tak poora principal clear ho jata hai, toh late charges aur administrative fees complete waive ho jayengi.",
        },
    },
}

# ==============================================================================
# 3. PATTERSON ET AL. ("CRUCIAL CONVERSATIONS") DE-ESCALATION
# ==============================================================================

CRUCIAL_CONVERSATIONS_TACTICS = {
    "contrasting_statements": {
        "pressure_vs_solution": {
            "en": "I am not calling to demand an unreasonable payment right this second. I am calling to make sure we don't let this slide into an unmanageable dispute for either party.",
            "hi-en": "Main kisi pressure ya behas ke liye call nahi kar rahi hoon. Main sirf yeh chahti hoon ki yeh matter dono parties ke liye koi unmanageable dispute na bane.",
        },
        "accusation_vs_reconciliation": {
            "en": "I am not saying your team deliberately withheld payment. I am here to help reconcile what was missed in the accounting workflow.",
            "hi-en": "Mera yeh matlab bilkul nahi hai ki aapne jaan-boojhkar payment roki hai. Main sirf accounting record mein jo miss hua use reconcile karne mein help kar rahi hoon.",
        },
    },
    "safety_restoration": {
        "anger_management": {
            "en": "I hear how frustrated you are. You shouldn't have to deal with repeated stress. Let's step back, pause active calls, and have our senior accounts team review the correspondence.",
            "hi-en": "Main samajh sakti hoon aapko kitna gussa aa raha hai. Aap par stress daalna hamara maksad nahi hai. Main abhi call hold par daalkar senior team ko review ke liye bhej deti hoon.",
        },
        "mutual_respect": {
            "en": "I value your time and the long-term relationship between both companies. Let's find an approach that respects both sides' constraints.",
            "hi-en": "Main aapke time aur dono companies ke long-term relation ki respect karti hoon. Chaliye dono ke constraints ko dhyan mein rakh kar rasta nikaalte hain.",
        },
    },
}

# ==============================================================================
# 4. ACADEMIC NEGOTIATION DIALOGUE ACTS (CaSiNo / CRAIGSLIST / DEALORNODEAL)
# ==============================================================================

NEGOTIATION_DIALOGUE_ACTS = [
    "greet_and_identify",      # Opening turn
    "explore_constraints",     # Active listening to debtor situation
    "label_emotion",           # Chris Voss labeling
    "anchor_ledger_fact",      # Harvard objective criteria
    "propose_concession_1",    # Ackerman 5% or milestone split
    "propose_concession_2",    # Ackerman 10% mandate ceiling
    "clarify_commitment",      # Extracting exact PTP date + amount + channel
    "de_escalate_safety",      # Crucial conversations contrasting
    "confirm_and_dispatch",    # Tool trigger: Razorpay link, Resend email, or PTP record
    "polite_close",            # Clean exit
]


def format_multi_turn_negotiation(
    family_id: str,
    scenario_type: str,
    language: str,
    facts: dict[str, Any],
) -> list[dict[str, Any]]:
    """Generate a realistic 3-to-4 turn negotiation sequence applying the combined frameworks."""
    amount_str = f"₹{facts.get('amount_due_minor', 4500000) // 100:,}"
    currency = facts.get("currency", "INR")
    client = facts.get("business_name", "Apex Studio")
    inv = facts.get("invoice_number", "INV-1042")

    turns = []

    if scenario_type == "cash_flow_hardship":
        # Turn 1: Debtor states hardship -> Agent applies Voss Tactical Empathy + Calibrated Question
        t1_user = (
            "Look, our own clients haven't cleared invoices this month. Cash flow is extremely tight, I can't pay right now."
            if language == "en"
            else "Dekhiye, hamare apne clients ne is mahine payment clear nahi ki. Cash flow bohot tight hai, abhi pay nahi kar sakta."
        )
        t1_reply = (
            f"It sounds like cash flow timing is putting serious pressure on your business right now. "
            f"How can we structure the {amount_str} balance so it gives your accounts room to breathe without halting services?"
            if language == "en"
            else f"Aisa lag raha hai ki client payments delay hone se aapke cash flow par kaafi pressure aa gaya hai. "
                 f"Hum is {amount_str} ke balance ko kaise structure karein taaki aapki company par achanak bojh na pade?"
        )
        turns.append({
            "turn_id": "T0",
            "state": "EXPLORING_CONSTRAINTS",
            "messages": [{"role": "user", "content": t1_user}],
            "target": {
                "intent": "hardship",
                "proposed_action": "apply_tactical_empathy",
                "free_reply": t1_reply,
                "candidate_slots": {"debtor_constraint": "cash_flow_tight"},
            },
        })

        # Turn 2: Debtor offers partial or installment -> Agent applies Harvard Mutual Gain (50-50 split)
        t2_user = (
            "Can I pay half now and clear the rest next month?"
            if language == "en"
            else "Kya main abhi aadha pay kar sakta hoon aur baaki agle mahine?"
        )
        t2_reply = (
            f"That is a constructive proposal. Under our mandate, we can split this into two milestones: "
            f"50% today via instant digital checkout, and the remaining balance scheduled for next month. "
            f"Would that solve the cash flow challenge for your accounts team?"
            if language == "en"
            else f"Yeh ek sensible proposal hai. Hamaare mandate ke tehat hum ise 2 parts mein kar sakte hain: "
                 f"50% aaj instant digital link se, aur baaki 50% next month scheduled date par. "
                 f"Kya isse aapki accounts team ke liye problem solve ho jayegi?"
        )
        turns.append({
            "turn_id": "T1",
            "state": "CONCESSION_BARGAINING",
            "messages": [{"role": "user", "content": t2_user}],
            "target": {
                "intent": "payment_proposal",
                "proposed_action": "propose_installment_split",
                "free_reply": t2_reply,
                "candidate_slots": {"split_ratio": "50_50"},
            },
        })

        # Turn 3: Debtor agrees -> Agent extracts specific commitment & triggers payment link
        t3_user = (
            "Yes, send me the link for 50% right now and I will pay it."
            if language == "en"
            else "Haan, abhi 50% ka payment link bhej do, main pay kar deta hoon."
        )
        t3_reply = (
            f"Perfect. I am generating a verified Razorpay payment link for 50% of the balance and recording your promise to pay. Thank you."
            if language == "en"
            else f"Bohot badhiya. Main 50% amount ka verified Razorpay link generate kar rahi hoon aur PTP schedule record kar rahi hoon. Shukriya."
        )
        turns.append({
            "turn_id": "T2",
            "state": "SETTLEMENT_CONFIRMED",
            "messages": [{"role": "user", "content": t3_user}],
            "target": {
                "intent": "delivery_request",
                "proposed_action": "create_payment_link",
                "free_reply": t3_reply,
                "tool_request": {"tool": "create_payment_link", "discount_bps": 0},
            },
        })

    elif scenario_type == "discount_bargaining":
        # Turn 1: Debtor asks for 20% discount -> Agent anchors ledger fact + Ackerman Step 2 (5%)
        t1_user = (
            "Give me a 20% flat discount and I will clear this invoice immediately today."
            if language == "en"
            else "Mujhe flat 20% discount do, main aaj ke aaj poora bill clear kar dunga."
        )
        t1_reply = (
            f"I appreciate your willingness to clear the balance today. However, a 20% discount is outside our authorized limits. "
            f"What I can do is apply an authorized 5% early settlement discount if you complete payment via digital link right now."
            if language == "en"
            else f"Aaj hi clear karne ki willingness ke liye shukriya. Lekin 20% discount hamare authority limit se bahar hai. "
                 f"Agar aap abhi digital link se settle karte hain, toh main authorized 5% early settlement concession apply kar sakti hoon."
        )
        turns.append({
            "turn_id": "T0",
            "state": "ANCHOR_AND_OFFER",
            "messages": [{"role": "user", "content": t1_user}],
            "target": {
                "intent": "discount",
                "proposed_action": "propose_ackerman_step_2",
                "free_reply": t1_reply,
                "candidate_slots": {"requested_discount": 2000, "offered_discount": 500},
            },
        })

        # Turn 2: Debtor pushes back -> Agent offers final Ackerman concession (10% mandate ceiling)
        t2_user = (
            "5% is too low. Make it at least 10% or I will have to delay this to next quarter."
            if language == "en"
            else "5% bohot kam hai. Kam se kam 10% karo warna yeh next quarter tak stretch ho jayega."
        )
        t2_reply = (
            f"Under our client mandate, 10% is the absolute maximum concession permitted. "
            f"If I apply that full 10% concession right now, can you commit to finalizing the payment before 5 PM today?"
            if language == "en"
            else f"Hamaare mandate mein 10% absolute maximum allowed concession hai. "
                 f"Agar main abhi full 10% concession laga kar link generate kar dun, toh kya aap aaj shaam 5 baje se pehle payment finalize kar denge?"
        )
        turns.append({
            "turn_id": "T1",
            "state": "FINAL_CONCESSION",
            "messages": [{"role": "user", "content": t2_user}],
            "target": {
                "intent": "discount",
                "proposed_action": "propose_ackerman_step_3",
                "free_reply": t2_reply,
                "candidate_slots": {"final_discount_bps": 1000},
            },
        })

        # Turn 3: Debtor agrees -> Agent dispatches discounted payment link
        t3_user = (
            "Done. Apply 10% and send me the link. I will settle it right now."
            if language == "en"
            else "Done. 10% lagao aur link bhejo. Main abhi settle kar deta hoon."
        )
        t3_reply = (
            f"Thank you for reaching an agreement. I am applying the 10% discount and generating your secure payment link now."
            if language == "en"
            else f"Samjhoute par pahunchne ke liye shukriya. Main 10% discount ke saath secure payment link generate kar rahi hoon."
        )
        turns.append({
            "turn_id": "T2",
            "state": "SETTLEMENT_CONFIRMED",
            "messages": [{"role": "user", "content": t3_user}],
            "target": {
                "intent": "delivery_request",
                "proposed_action": "create_payment_link",
                "free_reply": t3_reply,
                "tool_request": {"tool": "create_payment_link", "discount_bps": 1000},
            },
        })

    elif scenario_type == "dispute_resolution":
        # Turn 1: Debtor raises dispute -> Agent applies Crucial Conversations contrasting
        t1_user = (
            "The deliverables had major defects. I am disputing this charge and won't pay."
            if language == "en"
            else "Kaam mein bohot galtiyan thi. Main is payment ko dispute karta hoon aur pay nahi karunga."
        )
        t1_reply = (
            f"I hear your frustration regarding the deliverables. I am not calling to dispute your experience. "
            f"What specific scope items did not match your agreed requirements so we can document it formally?"
            if language == "en"
            else f"Main kaam ke defects ko lekar aapki narazgi samajh sakti hoon. Main aapse behas karne nahi aayi hoon. "
                 f"Kaunse specific items agreed scope se match nahi huye, taaki main ise formally document kar sakun?"
        )
        turns.append({
            "turn_id": "T0",
            "state": "DISPUTE_DISCOVERY",
            "messages": [{"role": "user", "content": t1_user}],
            "target": {
                "intent": "dispute",
                "proposed_action": "explore_dispute_scope",
                "free_reply": t1_reply,
            },
        })

        # Turn 2: Debtor gives detail -> Agent pauses active collection and routes to supervisor
        t2_user = (
            "The backend APIs were incomplete and failed during production testing."
            if language == "en"
            else "Backend APIs incomplete thi aur testing ke dauran crash ho gayi."
        )
        t2_reply = (
            f"Thank you for clarifying. I am placing an immediate pause on active billing for invoice {inv} "
            f"and routing your technical feedback to client management for reconciliation."
            if language == "en"
            else f"Details batane ke liye shukriya. Main invoice {inv} ki collection par turant pause laga rahi hoon "
                 f"aur aapke feedback ko review ke liye client management ko forward kar rahi hoon."
        )
        turns.append({
            "turn_id": "T1",
            "state": "PAUSED_DISPUTE",
            "messages": [{"role": "user", "content": t2_user}],
            "target": {
                "intent": "dispute",
                "proposed_action": "pause_for_dispute",
                "free_reply": t2_reply,
                "tool_request": {"tool": "pause_for_dispute", "reason": "technical_scope_defect"},
            },
        })

    elif scenario_type == "trust_and_scam_objection":
        # Turn 1: Debtor suspects scam -> Agent performs Voss Accusation Audit + Objective verification
        t1_user = (
            "How do I know this isn't a scam trying to steal funds?"
            if language == "en"
            else "Mujhe kaise pata ki yeh koi fraud call nahi hai jo paise churaane ki koshish kar raha hai?"
        )
        t1_reply = (
            f"You are right to be vigilant against fraud. You should never transfer funds without verification. "
            f"Would it be helpful if I request an official verified invoice copy sent to your established company email?"
            if language == "en"
            else f"Aapka alert rehna bilkul sahi hai. Bina verification ke kisi ko bhi payment nahi karni chahiye. "
                 f"Kya main verified invoice statement aapke official registered company email par deliver karwa dun?"
        )
        turns.append({
            "turn_id": "T0",
            "state": "TRUST_ESTABLISHMENT",
            "messages": [{"role": "user", "content": t1_user}],
            "target": {
                "intent": "trust",
                "proposed_action": "offer_verified_delivery",
                "free_reply": t1_reply,
            },
        })

        # Turn 2: Debtor agrees -> Agent dispatches via Resend
        t2_user = (
            "Yes, send the invoice to my registered email first. I will check it there."
            if language == "en"
            else "Haan, pehle mere registered email par invoice bhej do. Main wahan verify karunga."
        )
        t2_reply = (
            f"I have requested the statement of account for invoice {inv} to be delivered to your registered email. "
            f"Please verify it with your established accounts contact at your convenience."
            if language == "en"
            else f"Maine invoice {inv} ka statement aapke registered email par dispatch karne ka request submit kar diya hai. "
                 f"Aap suvidha anusar apne accounts team se verify karke proceed kar sakte hain."
        )
        turns.append({
            "turn_id": "T1",
            "state": "VERIFIED_DISPATCH",
            "messages": [{"role": "user", "content": t2_user}],
            "target": {
                "intent": "delivery_request",
                "proposed_action": "send_invoice_or_link",
                "free_reply": t2_reply,
                "tool_request": {"tool": "send_invoice_or_link", "channel": "email"},
            },
        })

    return turns
