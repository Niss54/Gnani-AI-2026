# ?? RevClaim AI � Master PRD & Codebase Extraction Blueprint

> **Product:** RevClaim AI � Autonomous Voice Calling Agent for Unpaid Invoices & B2B Revenue Recovery  
> **Target Event:** The Great Indian AI Challenge & Agentic AI Hackathon by Gnani.ai  
> **Target Outcome:** 10/10 Score in Sovereign Indic Voice AI, Inya Agentic Workflows & Multi-Dialect Debt Recovery  
> **Governance:** Enforced under the **Gravitas Engineering Reliability Runtime** (`gravitas/`)

---

## ?? 1. Executive Summary & Product Vision

### The Problem:
Every year, freelancers, solopreneurs, and digital agencies lose billions of dollars to **unpaid invoices, overdue milestones, and ghosting clients**. 
* Freelancers hate calling clients to demand overdue money � it's awkward, uncomfortable, and damages relationships.
* Traditional debt collection agencies charge 30�50% contingency fees and use aggressive, legally risky harassment.
* Email reminders get ignored, flagged as spam, or left unread.

### The Solution:
**RevClaim AI is an autonomous, empathetic, and compliant AI Voice Calling Agent that recovers overdue B2B invoices.**
1. **1-Click Call Dispatch:** A freelancer uploads or connects their overdue invoice (Client Name, Phone, Due Date, Amount).
2. **Empathetic Voice Negotiation:** The AI agent autonomously dials the client's phone via **Twilio + ElevenLabs Conversational AI**. It verifies the debtor's identity, politely explains the overdue balance with exact numbers, handles hardship or disputes with calibrated tone, and secures a **Promise-to-Pay (PTP)**.
3. **Instant Razorpay Link:** The moment the client commits to pay (in full or installment), **Sovereign Omnichannel Rail** triggers an instant SMS and WhatsApp message with a live **Razorpay checkout link**.
4. **Automated Settlement & Monetization:** Once the client pays via Razorpay, the freelancer gets their money back in real time. **RevClaim AI collects a small success fee (?199 / $5) via Razorpay.**

---

## ?? 2. Strategic Sponsor & Technology Alignment

| Sponsor / Track | Integration & Role in RevClaim AI | Judging Appeal & Criteria |
| :--- | :--- | :--- |
| **Gnani.ai Prisma STT**<br>*(Co-Powered Sponsor)* | **Voice-Driven Development & Prompt Engineering:** 100% of architecture specifications, agent system prompts, dialogue calibration, and task contracts dictated using Gnani.ai Prisma STT voice typing. Detailed evidence logged in `GNANI_CHALLENGE_PLAYBOOK.md` with WPM and screenshot proof. | Direct alignment with Gnani.ai Prisma STT's core mission: "Build with voice, not typing." |
| **Razorpay**<br>*(Merchant of Record)* | **Live Invoicing, Micro-Fees & Pay-Per-Recovery:** Razorpay API generates instant, zero-friction payment links sent via SMS/WhatsApp during the call. RevClaim charges a success fee via Razorpay. | Slide 13 mandate: *"Day 3 is launch day. Put a price on what you built."* Pure revenue validation. |
| **Sovereign Omnichannel Rail**<br>*(AI Automation Partner)* | **Cross-Platform Tool Actions via MCP:** Automates actions across 2,300+ SaaS apps: reads overdue invoices from Google Sheets/CRM, dispatches SMS via Twilio, and logs recovery transcripts to Slack. | Demonstrates real agentic tool-use through Model Context Protocol (MCP). |
| **Edge City & Davin Dong**<br>*(Grand Finale)* | **Frictionless Time-to-Value & Viral Retention:** Prosumers get an immediate 10-second "Aha!" moment. Dual-mode support (Live telephone call + Interactive in-browser demo). | Davin Dong (Growth legend): Solves a real acute economic pain with immediate monetization and viral loop. |

---

## ?? 3. Comprehensive Audit of Cloned Reference Repositories

We have audited the 6 cloned reference projects in the workspace. Below is the exact breakdown of **what we will extract, what we will discard, and what we will archive**.

```
RevClaim-AI/
+-- haggle/           [Cursor Hackathon 2nd Place Winner]  -> Frontend UI, Next.js 15, ElevenLabs Twilio Call
+-- CFLO-Agent/       [Fintech Collections Voice Agent]   -> Debt Prompts, PTP Commitments, Hardship Logic
+-- razorpay/             [Official Razorpay Starter]    -> Checkout API, Webhooks, Customer Portal
+-- DispatcherAI/     [Berkeley Grand Prize $64k Winner]  -> Live Cockpit UI, Waveforms, Real-time Transcripts
+-- constancia/       [AssemblyAI Hackathon Winner]       -> SQLite Call Schema, Multi-call Stateful Memory
+-- 11labs_Outbound/  [Twilio WebSockets Fastify]         -> Low-latency Duplex Audio Reference
```

---

### Project 1: `haggle/` (Cursor x TTW Hackathon � 2nd Place Overall Winner)
* **Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Lucide icons.
* **Core Strengths:** Complete full-stack Next.js architecture with native ElevenLabs Conversational AI + Twilio outbound calling (`/api/call`), real-time polling, and an **in-browser interactive simulation fallback** (`demo-call.ts`).
* **? WHAT WE EXTRACT (Keep for Core Build):**
  - `src/app/api/call/route.ts` & `src/app/api/call/[id]/route.ts`: Production-ready ElevenLabs Twilio call dispatch and status polling API.
  - `src/lib/elevenlabs.ts`: ElevenLabs official Conversational AI caller integration (`/v1/convai/twilio/outbound-call`), dynamic variable builder, and webhook signature verifier.
  - `src/lib/call-store.ts`: In-memory thread-safe state store for active and completed calls.
  - `src/lib/demo-call.ts`: Simulation engine that allows judges to run an end-to-end interactive mock call without entering real phone numbers!
  - `src/components/concierge-app.tsx` & `concierge-shell.tsx`: Beautiful responsive voice interface with mic button, status chips, and transcript card.
  - `src/lib/types.ts`: Clean TypeScript interfaces for CallRecord, CallResult, and DynamicVariables.
* **? WHAT WE DISCARD (Delete / Ignore):**
  - `src/lib/contacts.ts` (Honda car dealership mock contacts: "Durham Rapid Plumbing", "Lakeview Pipe", "Honda Civic Type R").
  - `src/lib/parse-intent.ts` (car dealership quote parsing logic).
  - Dealership-specific pricing thresholds (`target_price: 31000`).
* **?? WHAT WE ARCHIVE (Keep as Reference):**
  - `DESIGN.md` (Design guidelines from the hackathon).

---

### Project 2: `CFLO-Agent/` (Fintech Debt Collection Voice Agent)
* **Stack:** Python 3.11, FastAPI, Twilio Voice, Groq (Llama 3.3 70B), SQLite.
* **Core Strengths:** Deep domain expertise in collections psychology, calibrated empathy vs. firmness, identity verification, and Promise-to-Pay (PTP) commitments.
* **? WHAT WE EXTRACT (Keep for Core Build):**
  - `app/services/dialogue.py`: The battle-tested negotiation system prompt (`OUTBOUND_SYSTEM_PROMPT`):
    - Rule 1: Identity verification before disclosing financial details.
    - Rule 2: State exact overdue amount and days past due (DPD).
    - Rule 3: Empathetic response for genuine hardship (split installments).
    - Rule 4: PTP commitment logging (Promised Amount + Promised Date).
    - Rule 5: Short, conversational voice sentences (max 2 sentences per turn).
  - `data/database.py`: Clean SQLite database schema for `invoices`, `debtors`, `ptp_log`, and `call_log`.
* **? WHAT WE DISCARD (Delete / Ignore):**
  - Hardcoded Indian banking EMI terms ("loan_account", "RBI Fair Practice Code", "CFLO Financial Services").
  - Twilio DTMF keypad gathering (`twiml_gather_dtmf`) � voice recognition is 10x more natural.
* **?? WHAT WE ARCHIVE (Keep as Reference):**
  - `test_conversations.py` (Great reference for automated conversation quality testing).

---

### Project 3: `razorpay/` (Official Razorpay Next.js Starter)
* **Stack:** Next.js 16 App Router, `@razorpaypayments/nextjs`, Tailwind CSS.
* **Core Strengths:** Official, bulletproof checkout sessions and webhook verification.
* **? WHAT WE EXTRACT (Keep for Core Build):**
  - `src/app/api/checkout/route.ts`: Instant Razorpay checkout session creator (`POST /api/checkout`).
  - `src/app/api/webhook/route.ts`: Secure webhook handler listening for `onPaymentSucceeded` to automatically mark invoices as "RECOVERED".
  - `src/lib/products.ts`: Predefined recovery pricing tiers (?199 / $5 per successful recovery).
* **? WHAT WE DISCARD (Delete / Ignore):**
  - Generic e-commerce storefront components (`Footer.tsx`, `Header.tsx`, sample t-shirt `ProductCard.tsx`).
* **?? WHAT WE ARCHIVE (Keep as Reference):**
  - `README.md` (Quick reference for Razorpay environment variables and keys).

---

### Project 4: `DispatcherAI/` (UC Berkeley AI Hackathon � Grand Prize Winner, $64k)
* **Stack:** Next.js 16, TypeScript, Tailwind, Lucide, Prisma.
* **Core Strengths:** The undisputed benchmark for "Mission Control Cockpit" hackathon UI.
* **? WHAT WE EXTRACT (Keep for Core Build):**
  - `Design.md`: UI philosophy ("Anti-AI-slop, calm under pressure, deliberate operator console, serious about provenance").
  - Cockpit design tokens: High-contrast call status badges (`Live`, `Calling`, `PTP Secured`, `Settled`), real-time speaker vs. agent chat bubble stream, and urgency metrics.
* **? WHAT WE DISCARD (Delete / Ignore):**
  - 911 police/fire dispatch logic, CAD (Computer-Aided Dispatch) emergency vehicle routing, Retell AI wrappers.
  - Heavy Prisma ORM and Docker cloud configurations.
* **?? WHAT WE ARCHIVE (Keep as Reference):**
  - Case study layout ideas for the final pitch presentation.

---

### Project 5: `constancia/` (AssemblyAI Hackathon Winner � Business Automation Track)
* **Stack:** Python 3.12, SQLite, Twilio Voice Media Streams.
* **Core Strengths:** Stateful memory across calls (recalls what happened on Call #1 when placing Call #2).
* **? WHAT WE EXTRACT (Keep for Core Build):**
  - `schema.sql`: Multi-call history schema (`calls` table linked to `debtor_id` with `call_summary`, `transcript`, and `sentiment`).
  - Follow-up scheduler logic: If debtor promises payment by Friday, schedule automated follow-up check.
* **? WHAT WE DISCARD (Delete / Ignore):**
  - Physical rehabilitation medical questionnaires ("knee pain score", "exercise adherence protocol").
* **?? WHAT WE ARCHIVE (Keep as Reference):**
  - Automated smoke test scripts (`scripts/smoke_call.py`).

---

### Project 6: `11labs_Outbound/` (Twilio WebSocket Streaming with ElevenLabs)
* **Stack:** Node.js, Fastify, `@fastify/websocket`, Twilio, ElevenLabs.
* **Core Strengths:** Pure duplex WebSocket media stream (`<Connect><Stream url="wss://.../media-stream" />`).
* **? WHAT WE EXTRACT (Keep for Core Build):**
  - WebSocket protocol specifications for ultra-low latency audio streaming if direct telephony is chosen over the ConvAI REST endpoint.
* **? WHAT WE DISCARD (Delete / Ignore):**
  - Standalone Fastify server overhead (we consolidate into Next.js App Router API routes to eliminate dual-server hosting headaches).
* **?? WHAT WE ARCHIVE (Keep as Reference):**
  - `index.js` (Kept in reference archive as the gold standard for WebSocket TwiML streaming).

---

## ??? 4. Unified Target Architecture: `RevClaim-AI`

We unite the best elements into a **single, unified Next.js 15+ Fullstack monorepo** with zero bloat:

```
RevClaim-AI/
+-- src/
�   +-- app/
�   �   +-- api/
�   �   �   +-- call/
�   �   �   �   +-- route.ts           <-- [From Haggle] Outbound call dispatcher via ElevenLabs Twilio API
�   �   �   �   +-- [id]/route.ts      <-- [From Haggle] Real-time call status & transcript polling
�   �   �   +-- checkout/
�   �   �   �   +-- route.ts           <-- [From Razorpay] Dynamic Razorpay checkout session creator
�   �   �   +-- webhook/
�   �   �   �   +-- razorpay/route.ts      <-- [From Razorpay] Webhook: Payment succeeded -> Invoice marked RECOVERED
�   �   �   �   +-- elevenlabs/route.ts<-- [From Haggle] Webhook: Call completed -> Extract transcript & PTP
�   �   �   +-- mcp/
�   �   �       +-- sync/route.ts      <-- [Sovereign Omnichannel Rail] Dispatches recovery SMS & updates Google Sheets/Slack
�   �   +-- layout.tsx
�   �   +-- page.tsx                   <-- Landing + Mission Control Cockpit
�   �   +-- globals.css
�   +-- components/
�   �   +-- Cockpit.tsx                <-- [From DispatcherAI] Live operator console & stats
�   �   +-- InvoiceTable.tsx           <-- List of overdue invoices with 1-click "Recover via AI"
�   �   +-- LiveCallModal.tsx          <-- Real-time call visualization, transcript stream & audio waveform
�   �   +-- RazorpayPaymentBadge.tsx       <-- Live Razorpay checkout button & QR code
�   �   +-- DemoSimulationBanner.tsx   <-- [From Haggle] 1-Click Interactive Judge Demo Mode
�   +-- lib/
�   �   +-- elevenlabs.ts              <-- ElevenLabs ConvAI outbound call caller
�   �   +-- prompts.ts                 <-- [From CFLO] Debt collection & invoice negotiation prompts
�   �   +-- razorpay.ts                    <-- Razorpay SDK client
�   �   +-- db.ts                      <-- SQLite / In-memory persistence for invoices & call logs
�   �   +-- demo-data.ts               <-- Realistic sample invoices (Acme Corp, TechStart, DesignCo)
�   �   +-- types.ts                   <-- Unified TypeScript data models
+-- gravitas/                          <-- Gravitas Engineering Reliability Runtime (Installed)
+-- docs/                              <-- Technical architecture, setup guides, API briefs
+-- GNANI_CHALLENGE_PLAYBOOK.md                  <-- Gnani.ai Prisma STT voice dictation proof chain
+-- package.json                       <-- Clean Next.js 15 + Tailwind + Razorpay SDK + ElevenLabs
+-- .env.example                       <-- Clear API key blueprint
```

---

## ? 5. Step-by-Step Clean Migration Plan (Zero Accidents)

1. **Phase 1: Foundation Scaffolding (In Progress)**
   - Lock PRD & Extraction Blueprint (`PRD_AND_EXTRACTION_BLUEPRINT.md`).
   - Initialize clean root `package.json` with Next.js 15, Tailwind, `@razorpaypayments/nextjs`, and `lucide-react`.
2. **Phase 2: Code Extraction & Adaptation**
   - Copy and clean `elevenlabs.ts` and `/api/call` from `haggle/`.
   - Adapt `CFLO-Agent` negotiation prompts from banking EMI to B2B invoices.
   - Embed `razorpay/` checkout and webhook handlers.
3. **Phase 3: Cockpit UI & Demo-Mode Fallback**
   - Build the high-contrast operator cockpit (inspired by `DispatcherAI`).
   - Implement the `demo-call.ts` simulation mode so judges can evaluate 100% of the functionality without dialing real numbers.
4. **Phase 4: Sovereign Omnichannel Rail & Razorpay Integration Verification**
   - Wire MCP webhook for WhatsApp/SMS link dispatch.
   - Test Razorpay checkout generation in test mode.
5. **Phase 5: Safe Cleanup of Cloned Repos**
   - Move reference repos into a clean `.archive/` or delete unneeded files only *after* verified extraction.

---

## ??? 6. Gravitas Contract & Policy Record

```json
{
  "contract_id": "revclaim-extraction-v1",
  "planning": "deep",
  "context_depth": "dependency",
  "verification_depth": "impact",
  "delegation": "none",
  "invariants_enforced": [
    "Ground before mutating",
    "Stay in declared scope",
    "Completion needs evidence",
    "Never exact-retry a failure",
    "Zero uninspected file deletion"
  ]
}
```
