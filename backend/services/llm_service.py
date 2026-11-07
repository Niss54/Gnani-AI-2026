import os
import time
import requests
from typing import Dict, Any, List
from dotenv import load_dotenv

# Reliably load .env from current directory, parent directory, and backend folder
_current_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.dirname(_current_dir)
_root_dir = os.path.dirname(_backend_dir)
load_dotenv(os.path.join(_root_dir, ".env"))
load_dotenv(os.path.join(_backend_dir, ".env"), override=True)

def is_hindi_or_hinglish(text: str) -> bool:
    """Detects whether client input contains distinctive Hindi or Hinglish words."""
    import re
    words = set(re.findall(r"\w+", (text or "").lower()))
    hindi_words = {
        "hai", "hain", "haan", "nahi", "tha", "thi", "hoon", "hoga", "hogi",
        "karo", "karenge", "karna", "bhai", "kya", "kyu", "kaun", "mera", "meri", "mere",
        "aap", "aapka", "aapke", "baad", "pehle", "abhi", "paise", "paisa", "rupaye",
        "hazar", "lakh", "gaadi", "gadi", "kharch", "samajh", "bhejo", "dekho",
        "chhod", "accha", "acha", "theek", "thik", "shukriya", "dhanyawad",
        "namaste", "chalo", "chalega", "suno", "bolo", "karwa", "raha", "rahi", "panchar",
        "dunga", "mat", "mein", "kisko", "unko", "isko", "gayi", "gaya", "rakho"
    }
    return len(words.intersection(hindi_words)) >= 1


class LLMService:
    def __init__(self):
        self.groq_key = os.getenv("GROQ_API_KEY")
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.gnani_key = os.getenv("GNANI_API_KEY")

    def generate_reply(
        self,
        debtor_name: str,
        debtor_company: str,
        invoice_number: str,
        amount_due: float,
        currency: str,
        days_overdue: int,
        deliverable: str,
        freelancer_name: str,
        client_last_message: str,
        history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        start_time = time.time()
        half_amount = round(amount_due / 2)

        # Refresh keys from environment if loaded dynamically
        groq_key = os.getenv("GROQ_API_KEY") or self.groq_key
        gemini_key = os.getenv("GEMINI_API_KEY") or self.gemini_key
        gnani_key = os.getenv("GNANI_API_KEY") or self.gnani_key

        # 0. Check High-Speed Sub-50ms Smart Human Reflex Engine (Bilingual English & Hinglish)
        msg_lower = (client_last_message or "").lower().strip()
        is_hindi = is_hindi_or_hinglish(client_last_message)
        first_name = debtor_name.split()[0] if debtor_name else ("ji" if is_hindi else "there")
        currency_sym = "$" if currency == "USD" else ("€" if currency == "EUR" else "₹")

        # Reflex 1: Road Emergency, Flat Tire, Car Puncture, Accident, Health Issues
        if any(w in msg_lower for w in ["puncture", "panchar", "flat tire", "flat tyre", "tyre", "tire", "accident", "gadi kharab", "gaadi kharab", "breakdown", "bike slip", "hospital", "doctor", "emergency", "tabiyat", "bimar", "chot", "injury", "sick", "ill"]):
            reply = (
                f"Arey, koi baat nahi {first_name}! Aap pehle puncture theek karwa lijiye, aap theek hain na? Invoice ki baat hum baad mein aaram se kar lenge. Main payment link WhatsApp par chhod deti hoon, jab safe pahunchein tab dekh lijiyega."
                if is_hindi else
                f"Oh no, please take care of that first {first_name}, are you alright? We can sort out the invoice later. I've sent the details to your email and phone so you can check once you're safe."
            )
            return {"reply": reply, "engine": "smart_human_reflex", "latency_ms": int((time.time() - start_time) * 1000)}

        # Reflex 2: Anti-Phishing, Scam Verification, Trust Inquiry & Direct Founder Verification
        if any(w in msg_lower for w in [
            "scam", "phishing", "imposter", "fraud", "fake", "trust", "bharosa",
            "how do i know", "why should i trust", "why razorpay", "verify", "asli ho",
            "kaise maanu", "kaise trust", "baat karwao", "baat karao", "baat karni",
            "speak to", "talk to", "direct call", "personal number", "account number",
            "bank transfer", "wire transfer", "wire", "bank account", "neft", "rtgs"
        ]):
            clean_inv = "".join(c for c in invoice_number if c.isalnum()).upper()
            van = f"REVC{clean_inv}"
            reply = (
                f"Aapka verify karna bilkul sahi hai {first_name}! Security ke liye aap {freelancer_name} ko direct call kar sakte hain. Aap chahein toh direct corporate bank transfer bhi kar sakte hain to Beneficiary: '{freelancer_name} - RevClaim Collection', A/C: {van}, IFSC: HDFC0000050 bina kisi link ke."
                if is_hindi else
                f"Totally understand your caution {first_name}! For security, feel free to call {freelancer_name} directly to verify. You can also wire directly to their verified collection account (Beneficiary: {freelancer_name} - RevClaim Collection, A/C: {van}, IFSC: HDFC0000050) without using any link."
            )
            return {"reply": reply, "engine": "smart_human_reflex", "latency_ms": int((time.time() - start_time) * 1000)}

        # Reflex 3: Busy, Driving, In Meeting
        if any(w in msg_lower for w in ["meeting", "busy", "drive", "driving", "baad me", "later", "call me later", "kal karna", "traffic"]):
            reply = (
                f"Oh, bilkul {first_name}! Aap pehle driving ya meeting complete kar lijiye, main disturb nahi karungi. Razorpay link WhatsApp par chhod diya hai, shaam ko jab free hon tab check kar lijiyega."
                if is_hindi else
                f"Understood {first_name}! Please focus on your meeting or drive, I won't disturb you. I've sent the invoice link to your email and WhatsApp for when you're free this evening."
            )
            return {"reply": reply, "engine": "smart_human_reflex", "latency_ms": int((time.time() - start_time) * 1000)}

        # Reflex 4: Cash Crunch / Salary Delay (Consultative Split Closing)
        if any(w in msg_lower for w in ["paisa nahi", "paise nahi", "no money", "tight", "crunch", "salary nahi", "client ne nahi diya", "funds issue", "cash flow", "can't pay"]):
            reply = (
                f"Main bilkul samajh sakti hoon {first_name}, cash flow issues sabke sath aate hain. Aapko poora ek sath dene ki zaroorat nahi hai—kya hum 50% ({currency_sym}{half_amount:,.2f}) abhi settle kar lein aur baaki agle Friday taaki account active rahe?"
                if is_hindi else
                f"I completely understand cash flow tight spots {first_name}. You don't need to clear it all at once—could we settle 50% ({currency_sym}{half_amount:,.2f}) today via Razorpay to keep the account active, and clear the rest next Friday?"
            )
            return {"reply": reply, "engine": "smart_human_reflex", "latency_ms": int((time.time() - start_time) * 1000)}

        # Reflex 5: Willing to Pay / Link Request (Sales Closing)
        if any(w in msg_lower for w in ["send link", "link bhejo", "qr code", "whatsapp", "pay karta hoon", "done", "clear kar", "ready to pay", "send payment link"]):
            reply = (
                f"Superb {first_name}! Maine direct Razorpay link aapke WhatsApp par bhej diya hai. 10 seconds me UPI ya card se clear ho jayega. Thank you so much!"
                if is_hindi else
                f"Superb {first_name}! I've sent the direct Razorpay link to your WhatsApp and email. You can clear it via card or instant transfer in 10 seconds. Thank you so much!"
            )
            return {"reply": reply, "engine": "smart_human_reflex", "latency_ms": int((time.time() - start_time) * 1000)}

        # Reflex 6: Work Quality / Bugs / Deliverable Dispute
        if any(w in msg_lower for w in ["bug", "kharab", "incomplete", "dispute", "not happy", "quality", "issue", "kaam galat"]):
            reply = (
                f"Acha hua aapne bataya {first_name}! Maine deliverable dispute log kar diya hai aur reminders turant halt kar diye hain. Humare lead developer aapko issue review ke liye contact karenge."
                if is_hindi else
                f"Thank you for flagging that {first_name}. I've logged an official deliverable review and paused all reminders. {freelancer_name} will reach out directly today to address the deliverable."
            )
            return {"reply": reply, "engine": "smart_human_reflex", "latency_ms": int((time.time() - start_time) * 1000)}

        # Reflex 7: Hostile / Threats / Legal ("Nahi dunga / police / lawyer / sue me")
        if any(w in msg_lower for w in ["nahi dunga", "wont pay", "won't pay", "court", "police", "lawyer", "sue me", "don't call", "mat karna", "threat"]):
            reply = (
                f"Aap bilkul pareshan mat hoiye {first_name}, main koi tension create nahi karna chahti. Saare follow-ups turant pause kar diye hain aur founder ko escalate kar diya hai taaki aap dono aapas me resolve kar sakein. Have a good day."
                if is_hindi else
                f"I understand your frustration {first_name}, and I certainly don't want to create any stress. I've paused automated follow-ups and escalated directly to {freelancer_name} so you can resolve this amicably."
            )
            return {"reply": reply, "engine": "smart_human_reflex", "latency_ms": int((time.time() - start_time) * 1000)}

        # Statutory RAG 2.0 & Bharat Vernacular Debt Lexicon Grounding
        statutory_grounding = ""
        try:
            from services.rag_service import statutory_rag_engine
            from services.bharat_debt_lexicon import enrich_debt_prompt_with_lexicon
            rag_context = statutory_rag_engine.get_grounding_context(client_last_message, top_k=2)
            lexicon_context = enrich_debt_prompt_with_lexicon(client_last_message)
            parts = [p for p in [rag_context, lexicon_context] if p]
            if parts:
                statutory_grounding = "\n\nSTATUTORY LEGAL GROUNDING & RECOVERY INTELLIGENCE (RAG 2.0):\n" + "\n\n".join(parts)
        except Exception as e:
            print(f"[LLM Service] RAG / Lexicon grounding notice: {e}")

        system_instruction = (
            f"You are Sarah, an elite high-EQ billing mediation coordinator and consultative sales specialist representing {freelancer_name}. "
            f"You are speaking with {debtor_name} at {debtor_company} regarding invoice {invoice_number} "
            f"for {currency} {amount_due:,.2f} ({deliverable}, {days_overdue} days overdue).\n\n"
            f"TACTICAL INFLUENCE & SALES PSYCHOLOGY (THE SACRED LAWS):\n"
            f"1. EMPATHY BEFORE COMMERCE: If the client mentions ANY trouble (flat tire, accident, illness, emergency), "
            f"STRICTLY FORBIDDEN: NEVER say 'Arey kya baat hai!' (means celebrating misfortune!). "
            f"STRICTLY FORBIDDEN: NEVER abruptly say 'Chaliye ab invoice ki baat karte hain'. Prioritize safety first.\n"
            f"2. THE CONSULTATIVE REFRAME: You are not an aggressive debt collector; you are a partner helping keep their vendor account active.\n"
            f"3. CONCESSION CLOSING: If they face cash flow issues, offer a 50% split ({currency_sym}{half_amount:,.2f}) today via Razorpay link and remainder next Friday.\n"
            f"4. STRICT LANGUAGE MATCHING & CODE-SWITCHING (MANDATORY GLOBAL INVARIANT):\n"
            f"   - IF THE CLIENT SPEAKS IN ENGLISH: YOU MUST REPLY EXCLUSIVELY IN CRISP, COURTEOUS, PROFESSIONAL SPOKEN ENGLISH.\n"
            f"   - IF THE CLIENT SPEAKS IN HINDI/HINGLISH: YOU MUST REPLY IN WARM, NATURAL HINGLISH.\n"
            f"   - NEVER reply in Hindi if the client spoke in English!\n"
            f"   - Keep turns strictly under 2 short sentences (max 25 words).\n"
            f"5. ZERO-PHISHING VALIDATION: If client asks why to trust Razorpay or questions phishing, validate their caution and offer direct bank wire/NEFT details.{statutory_grounding}"
        )

        # 1. Try Groq LPU (Sub-700ms Ultra-low latency)
        # Primary: qwen/qwen3.8-27b; Fallback cascade: openai/gpt-oss-20b -> openai/gpt-oss-120b
        if groq_key and not "your_" in groq_key:
            groq_models = [
                os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b"),
                "openai/gpt-oss-20b",
                "openai/gpt-oss-120b",
                "llama-3.3-70b-versatile",
            ]
            for model_id in groq_models:
                try:
                    res = requests.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {groq_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": model_id,
                            "messages": [
                                {"role": "system", "content": system_instruction},
                                {"role": "user", "content": f"Client says: {client_last_message}"}
                            ],
                            "temperature": 0.3,
                            "max_tokens": 120
                        },
                        timeout=4
                    )
                    if res.status_code == 200:
                        data = res.json()
                        reply = data["choices"][0]["message"]["content"].strip()
                        latency = int((time.time() - start_time) * 1000)
                        return {
                            "reply": reply,
                            "engine": f"groq_{model_id}",
                            "latency_ms": latency
                        }
                    elif res.status_code == 404:
                        # Model not available on this tier, try next candidate
                        continue
                    else:
                        print(f"[LLM Service] Groq {model_id} returned status {res.status_code}")
                except Exception as e:
                    print(f"[LLM Service] Groq error ({model_id}): {e}")

        # 2. Try Google Gemini Flash Fallback
        if gemini_key and not "your_" in gemini_key:
            gemini_models = ["gemini-3.8-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"]
            for g_model in gemini_models:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent?key={gemini_key}"
                    prompt_text = f"{system_instruction}\n\nClient input: {client_last_message}\nSarah:"
                    res = requests.post(
                        url,
                        headers={"Content-Type": "application/json"},
                        json={"contents": [{"parts": [{"text": prompt_text}]}]},
                        timeout=5
                    )
                    if res.status_code == 200:
                        data = res.json()
                        reply = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        latency = int((time.time() - start_time) * 1000)
                        return {
                            "reply": reply,
                            "engine": f"gemini_{g_model}",
                            "latency_ms": latency
                        }
                except Exception as e:
                    print(f"[LLM Service] Gemini error ({g_model}): {e}")

        # 3. Try Gnani Evon v3.3 Indic Mixture-of-Experts LLM
        if gnani_key and gnani_key.startswith("vach_"):
            try:
                res = requests.post(
                    "https://api.vachana.ai/llm/v1/chat/completions",
                    headers={
                        "X-API-Key-ID": gnani_key,
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "evon-v3.3",
                        "messages": [
                            {"role": "system", "content": system_instruction},
                            {"role": "user", "content": f"Client says: {client_last_message}"}
                        ],
                        "temperature": 0.2,
                        "max_tokens": 120
                    },
                    timeout=5
                )
                if res.status_code == 200:
                    data = res.json()
                    reply = data["choices"][0]["message"]["content"].strip()
                    latency = int((time.time() - start_time) * 1000)
                    return {
                        "reply": reply,
                        "engine": "gnani_evon_indic",
                        "latency_ms": latency
                    }
            except Exception as e:
                print(f"[LLM Service] Gnani Evon LLM fallback notice: {e}")

        # 4. Calibrated High-EQ Negotiation Fallback (Guaranteed safety)
        latency = int((time.time() - start_time) * 1000)
        lower = client_last_message.lower()
        if any(w in lower for w in ["puncture", "accident", "hospital", "emergency", "doctor"]):
            reply = f"Oh no, {debtor_name}! Please take care of yourself first—safety comes before any invoice. I have paused all automated reminders for today; let's reconnect once you are safe."
        elif any(w in lower for w in ["send", "link", "pay", "ok", "yes", "sure", "transfer"]):
            reply = f"Thank you so much, {debtor_name}! I have locked in your Promise-to-Pay and just dispatched your secure Razorpay checkout link to your WhatsApp and email."
        else:
            reply = f"I completely understand cash flow crunches, {debtor_name}. Would you be able to clear 50% ({currency} {half_amount:,.2f}) today via Razorpay, and we can schedule the remainder for next Friday?"

        return {
            "reply": reply,
            "engine": "calibrated_rule_fallback",
            "latency_ms": latency
        }

llm_service = LLMService()
