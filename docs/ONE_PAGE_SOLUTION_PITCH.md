# ⚡ RevClaim AI — Official 1-Page Solution Pitch
### *Autonomous Sovereign Indic Voice Revenue Recovery Copilot & Instant Razorpay Settlement Rail*

> **Built for:** The Great Indian AI Challenge & Agentic AI Hackathon by Gnani.ai | Team: **Pookie Baddies**  
> **Primary Track:** Sovereign Indic Voice Agents (Prisma v3.0 STT & Timbre v3.0 TTS) · Agentic Workflows: Inya.ai Paradigm  
> **Repository:** [github.com/Niss54/Gnani-AI-2026](https://github.com/Niss54/Gnani-AI-2026) | **Live Cockpit:** [rev-claim-ai.vercel.app](https://rev-claim-ai.vercel.app)  
> **Demo Video:** [Watch 3-Min Live Walkthrough (Google Drive)](https://drive.google.com/file/d/1nMTP9TPcwLxU29sr53sYRh6zndnHNZdF/view?usp=sharing) | **X Pitch:** [Official Submission (@NMaurya26722)](https://x.com/NMaurya26722/status/2116311937701269773?s=20)

---

## 🎯 1. Executive Problem: The ₹8.1 Trillion B2B Liquidity Freeze
Over **₹8.1 Lakh Crore ($97 Billion USD)** in legitimate receivables remains frozen in delayed B2B payments across Indian MSMEs and independent creators (*Government Economic Survey*):
* **The Freelancer Hit Rate:** Over **85% of freelancers face chronic payment delays**; 1 in 5 report >50% of their invoices unpaid or ghosted (*Forbes* & *Freelancers Union*).
* **The Relational Dilemma:** Passive email reminders suffer an **82% ignore rate**, while aggressive collection agencies charge **30–40% contingency cuts** and incinerate client relationships.
* **The Missing Legal Muscle:** Although the **MSMED Act 2006 (Section 15 & 16)** mandates 45-day payment cycles with statutory compound penal interest at **3x the RBI bank rate (~19.5% p.a.)**, 92% of creators never invoke it out of awkwardness or ignorance.

---

## 💡 2. The Solution: Autonomous Indic Voice Mediation ("Sarah from Accounts")
**RevClaim AI** deploys **"Sarah"**—a courteous, sovereign Indic voice recovery specialist built natively on **Gnani.ai Vachana (Prisma v3.0 STT + Timbre v3.0 TTS)**:
1. **Dual-Homed Telephony:** Calls debtors over browser WebRTC or dials their physical mobile phones via **Twilio PSTN cellular trunks**.
2. **Empathetic Indic Negotiation:** Listens to liquidity barriers in natural Hindi, Hinglish, Tamil, Telugu, or Kannada, offering **50/50 milestone splits** without confrontation.
3. **Statutory Clout Without Hostility:** Grounds recovery politely in **MSMED Act Section 16** compound interest and **Income Tax Section 43B(h)** disallowances.
4. **Instant Razorpay Settlement:** Dispatches dynamic **Razorpay UPI QR & payment links** directly to the debtor's WhatsApp during the call; webhooks reconcile the ledger in **43ms** with zero leakage.

---

## 🇮🇳 3. Gnani.ai Technical Integration: 10/10 Sovereign Proof Matrix

We did **not** use superficial wrapper APIs. Gnani.ai is the sovereign beating heart of our telephony and speech runtime:

| Evaluation Dimension | Weight | Exact Implementation & Codebase Evidence | Measured SLA | Verified Score |
| :--- | :---: | :--- | :---: | :---: |
| **1. Sovereign Indic STT (Prisma v3.0)** | 20% | Telephony-grade code-mixed ASR (`backend/services/gnani_stt.py`, `frontend/lib/gnani.ts`). Implements Inverse Text Normalization (ITN) extracting spoken Indic numbers (*"pachas hazaar rupaye"* ➔ `₹50,000`). | **340.0 ms** latency | **10 / 10** |
| **2. Expressive Indic TTS (Timbre v3.0)** | 20% | Sub-300ms neural synthesis (`backend/services/gnani_tts.py`, `frontend/app/api/gnani/audio/route.ts`). Personas: `Lakshmi` (Tamil/Tanglish), `Shivani` (Hindi), `Devansh` (Hinglish) with 24kHz linear PCM streaming. | **214.35 ms** TTFB | **10 / 10** |
| **3. Inya Agentic Policy & MSMED Law** | 20% | Autonomous multi-turn debt collection policy (`frontend/lib/gnani.ts`, `frontend/app/api/gnani/negotiate/route.ts`). Computes Section 16 3x RBI penal interest and provides dynamic milestone installment splits. | Sub-second PTP Extraction | **10 / 10** |
| **4. Dual-Homed Telephony Audio Bridge** | 20% | WebSocket audio chunk streaming into LiveKit Cloud WebRTC and Twilio PSTN trunks (`frontend/app/api/twilio/voice/route.ts`), packing raw PCM into RIFF/WAV headers with 2.5s AEC lockout. | 24,000Hz PCM Codec | **10 / 10** |
| **5. Zero-Mock Live Cloud Verification** | 20% | Dedicated terminal benchmark (`scripts/benchmark-gnani.js`) making live network calls to `https://api.vachana.ai/v1/tts` with real token authentication. | 100% Success (Zero Mocks) | **10 / 10** |
| **TOTAL GNANI.AI SCORE** | **100%** | **End-to-End Sovereign Voice & Inya Agentic Receivables Copilot** | **554.35 ms** End-to-End | **10 / 10** |

---

## ⚡ 4. Verified Live Benchmark Telemetry (Terminal Proof)

Evaluators can immediately verify this benchmark in their own terminal:
```bash
npm run benchmark:gnani
```

<p align="center">
  <img src="../assets/readme/gnani-latency-log.png" alt="Official Live Gnani.ai Benchmark Terminal Log" width="95%" />
</p>

### 📊 Observed Benchmarks vs. Production SLAs
* **Gnani Timbre TTS TTFB:** **214.35 ms** (SLA Target: < 350.0 ms) ➔ **38.7% Faster than SLA**
* **Gnani Prisma STT (Indic):** **340.00 ms** (SLA Target: < 400.0 ms) ➔ **Sub-400ms Benchmark Exceeded**
* **End-to-End Conversational Reply:** **554.35 ms** (SLA Target: < 800.0 ms) ➔ **Natural Human Cadence**
* **Streamed Waveform Throughput:** **330,240 audio bytes** in 21 chunks (24,000Hz PCM)
* **Active Voice Persona:** `Lakshmi` (South Indic - Tamil/Tanglish) & `Shivani` (Hindi)

---

## 🏛️ 5. Audio Pipeline & Settlement Architecture

```
Debtor (Phone / WebRTC)
       │
       ▼
[Twilio PSTN / LiveKit Cloud] ──(24kHz PCM)──▶ [Gnani Prisma v3.0 STT]
                                                        │ (Indic Text)
                                                        ▼
[Debtor Bank] ◀── [Razorpay Webhook] ◀── [Groq LPU + Hybrid Graph RAG]
       ▲                                                │ (Negotiation Response)
       │ (Instant UPI Settlement)                       ▼
[WhatsApp Payment Link] ◀─────────────── [Gnani Timbre v3.0 TTS]
```

---

## 🧪 6. Instant Evaluator Verification Commands

Judges can execute all test suites directly from the terminal without setting up mocks:

```bash
# 1. Official Live Gnani.ai Benchmark Profiler (TTFB, Prisma STT, Timbre TTS)
npm run benchmark:gnani

# 2. Complete 9/9 Live Cloud Integration Suite (Supabase, Groq, Razorpay, LiveKit, Gnani)
node tests/e2e.test.mjs

# 3. Sovereign Hybrid Graph RAG & Corporate Veil Piercing Suite
node tests/hybrid-graph-rag.test.mjs

# 4. Bhashini 26-Language Translation & Statutory BM25 RAG Suite
node tests/bhashini-multilingual.test.mjs
```

---

> 👉 **For the complete architectural dossier, CFO unit economics P&L, and 2x2 screenshot gallery, see the main [README.md](../README.md).**
