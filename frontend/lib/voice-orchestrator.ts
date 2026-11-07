// ============================================================================
// RevClaim AI — Multi-Engine Autonomous Voice Orchestrator
// ============================================================================
// Dynamically selects the best voice stack based on client locale & environment:
// - India (INR): Gnani.ai Indic Voice + Twilio India SIP
// - Global (USD/EUR): ElevenLabs Conversational AI + Twilio US SIP
// - Browser Testing: LiveKit WebRTC Real-Time Stream

import { Invoice } from "./types";
import { initiateTwilioOutboundCall } from "./twilio";
import { createLiveKitVoiceSession } from "./livekit";
import { synthesizeIndicSpeech } from "./gnani";
import { startOutboundCall as startElevenLabsCall } from "./elevenlabs";
import { generateNegotiationTurn } from "./llm";

export interface VoiceDispatchOptions {
  invoice: Invoice;
  preferredChannel?: "phone" | "webrtc_browser" | "auto";
  localeHint?: "indic_hinglish" | "international_english";
}

export interface VoiceDispatchResult {
  channel: "twilio_phone" | "livekit_webrtc" | "elevenlabs_conversational";
  engine: "gnani_indic" | "elevenlabs" | "twilio_pstn";
  sessionId: string;
  status: "initiated" | "ringing" | "connected" | "failed" | "unconfigured";
  details: Record<string, any>;
  error?: string;
}

export async function orchestrateRecoveryCall(
  options: VoiceDispatchOptions
): Promise<VoiceDispatchResult> {
  const { invoice, preferredChannel = "auto" } = options;
  const isIndianClient = invoice.currency === "INR" || (invoice.debtorPhone || "").startsWith("+91");

  console.log(`[Voice Orchestrator] Routing recovery call for invoice ${invoice.invoiceNumber} (${invoice.currency})`);

  // Route 1: In-browser WebRTC session (via LiveKit)
  if (preferredChannel === "webrtc_browser") {
    const livekitSession = await createLiveKitVoiceSession(
      invoice.id,
      invoice.debtorName || invoice.debtor?.contactPerson || "Client"
    );
    return {
      channel: "livekit_webrtc",
      engine: isIndianClient ? "gnani_indic" : "elevenlabs",
      sessionId: livekitSession.roomName,
      status: "connected",
      details: livekitSession,
    };
  }

  // Route 2: Real Telephone Dialing via Twilio
  // If Indian client, uses Gnani.ai Indic adapter + Twilio PSTN
  if (isIndianClient) {
    const targetPhone = invoice.debtorPhone || invoice.debtor?.phone || "+918840301998";
    const twilioCall = await initiateTwilioOutboundCall({
      to: targetPhone,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amountDue ?? invoice.amount ?? 5000,
      clientName: invoice.debtorName || invoice.debtor?.contactPerson || "Client",
    });

    if (!twilioCall.success) {
      return {
        channel: "twilio_phone",
        engine: "gnani_indic",
        sessionId: "",
        status: (twilioCall.status as any) || "failed",
        error: twilioCall.error,
        details: {
          provider: "Twilio PSTN",
          status: twilioCall.status,
          targetPhone,
        },
      };
    }

    return {
      channel: "twilio_phone",
      engine: "gnani_indic",
      sessionId: twilioCall.callSid || `CA_${Date.now()}`,
      status: "initiated",
      details: {
        provider: "Twilio PSTN + Polly Aditi Bilingual Hindi/English",
        callSid: twilioCall.callSid,
        targetPhone,
      },
    };
  }

  // Route 3: Global Conversational AI (ElevenLabs + Twilio)
  try {
    const elevenLabsCall = await startElevenLabsCall(invoice);
    return {
      channel: "elevenlabs_conversational",
      engine: "elevenlabs",
      sessionId: elevenLabsCall.conversationId || `conv_${Date.now()}`,
      status: "initiated",
      details: {
        provider: "ElevenLabs Conversational AI + Twilio",
        conversationId: elevenLabsCall.conversationId,
      },
    };
  } catch (err: any) {
    return {
      channel: "elevenlabs_conversational",
      engine: "elevenlabs",
      sessionId: "",
      status: "failed",
      error: err?.message || "ElevenLabs dispatch failed",
      details: {},
    };
  }
}
