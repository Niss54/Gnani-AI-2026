# ?? RevClaim AI � Master PRD & Comprehensive Codebase Audit

> **Event:** The Great Indian AI Challenge & Agentic AI Hackathon by Gnani.ai  
> **Target:** 10/10 Score in Sovereign Indic Voice AI, Inya Agentic Workflows & Multi-Dialect Debt Recovery  
> **Mission:** Build **RevClaim AI** � an autonomous, sovereign Indic voice-calling debt and unpaid invoice recovery copilot for Indian MSMEs, freelancers, and digital agencies.

---

## ?? 1. Executive Summary & The Winning Formula

### The Problem
* Freelancers, creative agencies, and solopreneurs lose **15% to 30% of their revenue** to ghosted clients, overdue invoices, and late payments.
* Chasing money via email or WhatsApp is awkward, confrontational, and time-consuming. Human debt collectors charge 25%�40% and intimidate clients.

### The Solution: RevClaim AI
* An autonomous AI voice agent that calls clients on their phone, speaks with calibrated empathy and firmness, verifies their invoice details, negotiates split payments or hardship schedules, and captures a binding **Promise-to-Pay (PTP)** commitment.
* During or immediately after the call, an instant **Razorpay** link is sent via WhatsApp/SMS so the client can settle the debt on the spot.
* RevClaim AI takes a small success fee (?199 or $5) via Razorpay for every recovered invoice.

### Why Judges (Davin Dong & Partners) Will Crown This:
1. **Davin Dong Appeal (Growth & Utility):** Solves an acute, urgent economic pain with an immediate 10-second aha moment. Zero fluff.
2. **Razorpay Track Alignment:** Razorpay is a Merchant of Record (MoR) whose primary reason to exist is compliance and global revenue. An invoice recovery agent natively integrated with Razorpay is a tailor-made track winner.
3. **Gnani.ai Prisma STT Track Alignment:** Built and orchestrated using Gnani.ai Prisma STT voice dictation with an airtight `GNANI_CHALLENGE_PLAYBOOK.md` audit dossier.
4. **Sovereign Omnichannel Rail Alignment:** Automated multi-step actions across Slack, Google Sheets, and CRM via Sovereign Omnichannel Rail.
5. **Live "Holy Sh*t" Demo:** Type a number on the dashboard ? Table phone rings live ? AI voice negotiates ? Razorpay payment link arrives ? Client pays ? Dashboard ticks "RECOVERED" in real time.

---

## ?? 2. Detailed Codebase Audit (Project-by-Project)

The repository currently contains 6 reference codebases. Here is the surgical breakdown of what to **EXTRACT (Golden Assets)**, what to **DISCARD (Fluff)**, and how each powers `RevClaim AI`.

---

### Project 1: `haggle/` (Cursor Voice Hackathon � 2nd Place Overall Winner)
* **What it does:** Next.js 15+ voice-first app with in-browser Concierge and outbound phone caller (Negotiator) via ElevenLabs + Twilio.
* **Architecture:** Next.js 16 App Router, TypeScript, Tailwind CSS, Lucide icons.

#### ?? What to EXTRACT (Keep):
1. **`src/lib/elevenlabs.ts`:** Official integration with `https://api.elevenlabs.io/v1/convai/twilio/outbound-call`. Supports passing dynamic client variables (debtor name, invoice #, amount due, overdue days).
2. **`src/app/api/call/route.ts` & `src/app/api/call/[id]/route.ts`:** Complete outbound call initiation, polling, and status management.
3. **`src/lib/demo-call.ts`:** **CRITICAL HACKATHON ASSET.** A built-in interactive demo simulation engine. If judges or mentors test without an active Twilio number or API credits, the system seamlessly runs a simulated live negotiation call with full transcript streams in the UI.
4. **`src/lib/call-store.ts`:** In-memory call record tracker with UUIDs, statuses (`calling`, `completed`, `failed`), and transcripts.
5. **`src/components/concierge-app.tsx` & `concierge-shell.tsx`:** Sleek, reactive voice interface with call triggers and status badges.

#### ??? What to DISCARD (Do Not Use):
* Car dealership mock contacts (`contacts.ts`).
* Car-specific intent parser tests (`parse-intent.test.ts`).
* Hardcoded Honda Civic negotiation data.

---

### Project 2: `CFLO-Agent/` (Fintech Debt Collection AI Agent)
* **What it does:** FastAPI + Twilio Voice + Groq (Llama 3.3 70B) outbound debt collection agent with tone calibration and Promise-to-Pay (PTP) commitment tracking.

#### ?? What to EXTRACT (Keep):
1. **`app/services/dialogue.py`:** The **Golden Prompt Engineering** for debt and payment collection:
   - Identity verification protocol: *"Am I speaking with [First Name]?"*
   - Exact numbers enforcement: Never hallucinating numbers, citing exact overdue amounts and days past due (DPD).
   - Hardship vs. Defaulter tone calibration: Empathetic for illness/job loss, firm for chronic delays.
   - PTP Commitment Parser: Structured regex/token capture (`PTP_CAPTURED|amount|date`).
2. **`data/database.py`:** Clean SQLite schema for `borrowers` (adapted to `invoices`), `ptp_log` (commitments), and `call_log`.
3. **`app/routes/voice.py`:** TwiML webhook handlers for Twilio voice streaming and speech-to-text fallbacks.

#### ??? What to DISCARD (Do Not Use):
* Bank-specific KYC modules and SendGrid email scripts (`sendgrid==6.12.5`).
* Legacy TwiML Polly Aditi DTMF keypad gathers.
* Outdated MySQL connectors (`aiomysql`, `PyMySQL`).

---

### Project 3: `razorpay/` (Official Razorpay Next.js Boilerplate)
* **What it does:** Official Next.js 16 boilerplate from Razorpay integrating `@razorpaypayments/nextjs`.

#### ?? What to EXTRACT (Keep):
1. **`src/app/api/checkout/route.ts`:** Single-line export using `Checkout({ bearerToken, returnUrl, environment })` for static and session checkouts.
2. **`src/app/api/webhook/route.ts`:** Built-in `Webhooks` listener handling `onPaymentSucceeded` to update invoice status from "Pending" to "RECOVERED" automatically.
3. **`src/lib/products.ts`:** Razorpay pricing and credit tier definitions.

#### ??? What to DISCARD (Do Not Use):
* Generic Next.js placeholder SVG icons (`public/globe.svg`, `public/window.svg`).
* Standard product card display components that don't match the cockpit style.

---

### Project 4: `DispatcherAI/` (UC Berkeley AI Hackathon � Grand Prize Winner, $64k)
* **What it does:** Emergency response dispatcher with real-time waveform visualizers, emotion triage, and live operator cockpit.

#### ?? What to EXTRACT (Keep):
1. **UI Cockpit Aesthetic:** Sleek dark-mode operator panel with live call timer, status pills, and split-screen transcript stream.
2. **Live Waveform & Audio Indicators:** Visual audio pulse when the call is active.
3. **Triage Severity Badging:** High/Medium/Low urgency indicators based on debtor responsiveness.

#### ??? What to DISCARD (Do Not Use):
* Heavy 911 dispatching logic and map dependencies (`leaflet`, `mapbox-gl`, `@maptiler/leaflet-maptilersdk`).
* Complex Prisma multi-tenant configurations.
* Retell SDK dependencies (we use ElevenLabs + Twilio).

---

### Project 5: `constancia/` (AssemblyAI Voice Agent Winner � Business Automation Track)
* **What it does:** Stateful follow-up voice agent with contradiction retirement and memory.

#### ?? What to EXTRACT (Keep):
1. **Call Memory Concept:** The agent remembers what the debtor promised in call #1. If call #2 happens 3 days later, the agent starts with: *"Hi Rahul, on Tuesday you mentioned you would transfer ?10,000 by today. Were you able to initiate that?"*
2. **Deterministic Guardrails:** Safety rules enforced in code (not just prompt) against abusive or illegal threats.

#### ??? What to DISCARD (Do Not Use):
* Home-rehab patient protocols and medical questions.
* Python `uv.lock` and Makefile build scripts.

---

### Project 6: `11labs_Outbound/` (Direct Twilio-ElevenLabs WebSocket Bridge)
* **What it does:** Minimal Node.js/Fastify script demonstrating low-latency bidirectional audio streaming between Twilio Voice and ElevenLabs WebSockets.

#### ?? What to EXTRACT (Keep):
1. Reference WebSocket streaming TwiML `<Connect><Stream url="..." />` for zero-latency voice when using raw Twilio media streams.

#### ??? What to DISCARD (Do Not Use):
* Standalone Fastify server (we unify everything into Next.js 16 App Router for clean deployment on Vercel).

---

## ??? 3. The Unified System Architecture

We will unify all extracted golden components into a single **Next.js 16 Full-Stack Application** inside the root of `RevClaim-AI`:

```
RevClaim-AI/
+-- src/
�   +-- app/
�   �   +-- api/
�   �   �   +-- call/               <-- From haggle: Initiates ElevenLabs/Twilio outbound call
�   �   �   +-- call/[id]/          <-- From haggle: Polls call status and transcript
�   �   �   +-- checkout/           <-- From razorpay: Generates live Razorpay checkout link
�   �   �   +-- webhooks/razorpay/      <-- From razorpay: Listens for onPaymentSucceeded
�   �   �   +-- webhooks/eleven/    <-- From haggle: Listens for call completion & transcript
�   �   �   +-- invoices/           <-- CRUD for overdue invoices
�   �   +-- layout.tsx
�   �   +-- page.tsx                <-- Cockpit UI (Haggle + DispatcherAI style)
�   +-- components/
�   �   +-- cockpit-header.tsx      <-- Live stats (Total Debt, Recovered, Active Calls)
�   �   +-- invoice-table.tsx       <-- List of overdue invoices with 1-click "Call Agent"
�   �   +-- live-call-modal.tsx     <-- Live waveform, call timer, streaming transcript
�   �   +-- ptp-badge.tsx           <-- Promise-to-Pay commitment tracker
�   +-- lib/
�   �   +-- elevenlabs.ts           <-- ElevenLabs ConvAI outbound caller
�   �   +-- dialogue-prompts.ts     <-- Extracted from CFLO-Agent (negotiation & tone)
�   �   +-- demo-call.ts            <-- Extracted from haggle (offline interactive demo mode)
�   �   +-- razorpay-payments.ts        <-- Razorpay client & checkout helpers
�   �   +-- call-store.ts           <-- Call session & state manager
�   �   +-- Sovereign Omnichannel-mcp.ts        <-- MCP workflow triggers (Slack, SMS, Sheets)
�   +-- types/
�       +-- index.ts                <-- Unified types for Invoices, Calls, PTPs
+-- GNANI_CHALLENGE_PLAYBOOK.md               <-- Voice-driven development audit trail
+-- ARCHITECTURE.md
+-- package.json
+-- .env.example
```

---

## ??? 4. Safe Step-by-Step Execution Plan (No Blind Deletions)

1. **Step 1: Grounding & Architecture Freeze (Current Step):**  
   All codebases audited. We know exactly what to extract from each.
2. **Step 2: Scaffold Unified Root Application:**  
   Install core dependencies (`next@16`, `@elevenlabs/react`, `@razorpaypayments/nextjs`, `lucide-react`, `tailwind`) in the root.
3. **Step 3: Extract & Adapt Core Modules:**  
   - Port `src/lib/elevenlabs.ts` and `demo-call.ts` from `haggle`.
   - Port negotiation prompts and PTP parsing from `CFLO-Agent/app/services/dialogue.py`.
   - Port Razorpay checkout and webhook handlers from `razorpay/`.
4. **Step 4: Build the Cockpit Dashboard:**  
   Create the unified invoice management & live call interface.
5. **Step 5: Verify Both Modes (Live Phone + Interactive Simulation):**  
   Ensure the app works seamlessly with live Twilio calls AND fallback interactive demo mode.
6. **Step 6: Archive Reference Folders:**  
   Only after the root application is 100% verified and running, move the 6 cloned reference folders into an archive or remove them cleanly.
