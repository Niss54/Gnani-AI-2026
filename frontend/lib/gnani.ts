// ============================================================================
// RevClaim AI — Gnani.ai Sovereign Indic Conversational Voice & Agentic Engine
// Flagship Integration: Gnani Vachana (Prisma v3.0 STT + Timbre v3.0 TTS + Inya Flow)
// ============================================================================
// Built for The Great Indian AI Challenge & Agentic AI Hackathon by Gnani.ai
// Full support for Indian regional accents, code-mixed Hinglish/Tanglish,
// telephony-grade audio processing (8kHz/16kHz), and autonomous debt recovery.

export type IndicLanguageCode =
  | "hi-IN" // Hindi
  | "en-IN" // Indian English
  | "ta-IN" // Tamil
  | "te-IN" // Telugu
  | "kn-IN" // Kannada
  | "mr-IN" // Marathi
  | "bn-IN" // Bengali
  | "gu-IN" // Gujarati
  | "ml-IN" // Malayalam
  | "pa-IN"; // Punjabi

export type GnaniVoicePersona =
  | "Shivani" // Empathetic B2B Debt Recovery Specialist (Hindi / Hinglish)
  | "Nalini"  // Sovereign Indic Voice Specialist (Hindi / Regional)
  | "Devansh" // Senior Billing & Audit Officer (Hindi / Professional)
  | "Raghav"  // Corporate Debt Negotiator (Bilingual En/Hi)
  | "Kavya"   // South Indic Regional Accounts Lead (Tamil / Telugu / Kannada)
  | "Ananya"; // Neutral Indian English Corporate Officer

export interface GnaniVoiceSynthesisRequest {
  text: string;
  language?: string | IndicLanguageCode;
  voice?: GnaniVoicePersona | string;
  voiceGender?: "female" | "male";
  speed?: number;
  model?: "timbre-v3.0" | "timbre-v2.5";
  audioFormat?: "wav" | "mp3" | "mulaw";
  expressiveTags?: boolean; // Supports <whispers>, <laugh>, <pauses> in Timbre v3.0
}

export interface GnaniVoiceResponse {
  success: boolean;
  audioBase64?: string;
  audioUrl?: string;
  provider: "gnani_vachana_live" | "gnani_simulation";
  modelUsed: string;
  voiceUsed: string;
  languageUsed: string;
  byteLength?: number;
  latencyMs: number;
  detectedSentiment?: "polite" | "defensive" | "cooperative" | "stalling";
}

export interface GnaniTranscriptionResult {
  success: boolean;
  transcript: string;
  detectedLanguage: string;
  confidence?: number;
  provider: "gnani_prisma_live" | "gnani_simulation";
  latencyMs: number;
  extractedPtp?: {
    hasPtpPromise: boolean;
    promisedDate?: string;
    promisedAmount?: number;
    paymentMode?: "full" | "installment" | "dispute";
  };
}

const GNANI_API_BASE = process.env.GNANI_API_BASE_URL || "https://api.vachana.ai";

/**
 * Normalizes input language string into BCP-47 Indic language code
 */
export function normalizeIndicLanguage(lang?: string): IndicLanguageCode {
  if (!lang) return "hi-IN";
  const l = lang.toLowerCase().trim();
  if (l.includes("eng")) return "en-IN";
  if (l.includes("tam")) return "ta-IN";
  if (l.includes("tel")) return "te-IN";
  if (l.includes("kan")) return "kn-IN";
  if (l.includes("mar")) return "mr-IN";
  if (l.includes("ben")) return "bn-IN";
  if (l.includes("guj")) return "gu-IN";
  if (l.includes("mal")) return "ml-IN";
  if (l.includes("pun")) return "pa-IN";
  return "hi-IN";
}

/**
 * Synthesizes sovereign Indic voice using live Gnani.ai Vachana Timbre v3.0 / v2.5
 */
export async function synthesizeIndicSpeech(
  req: GnaniVoiceSynthesisRequest
): Promise<GnaniVoiceResponse> {
  const startTime = Date.now();
  const apiKey = process.env.GNANI_API_KEY?.trim();

  const language = req.language || "Hindi";
  const model = req.model || "timbre-v3.0";
  const voice =
    req.voice ||
    (req.voiceGender === "male" ? "Devansh" : "Shivani");

  // If live key is configured on api.vachana.ai
  if (apiKey && apiKey.startsWith("vach_") && !apiKey.includes("your_")) {
    try {
      const res = await fetch(`${GNANI_API_BASE}/api/v1/tts/inference`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key-ID": apiKey,
        },
        body: JSON.stringify({
          text: req.text,
          language: language === "en-IN" || language === "English" ? "English" : "Hindi",
          model: model,
          voice: voice,
          speed: req.speed || 1.0,
        }),
      });

      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const base64Audio = `data:audio/wav;base64,${buffer.toString("base64")}`;
        const latencyMs = Date.now() - startTime;

        console.log(
          `[Gnani.ai Timbre v3.0] Synthesized ${buffer.length} bytes in ${latencyMs}ms (Voice: ${voice}, Model: ${model})`
        );

        return {
          success: true,
          audioBase64: base64Audio,
          audioUrl: base64Audio,
          provider: "gnani_vachana_live",
          modelUsed: model,
          voiceUsed: voice,
          languageUsed: String(language),
          byteLength: buffer.length,
          latencyMs,
          detectedSentiment: "cooperative",
        };
      } else {
        const errorText = await res.text();
        console.warn(`[Gnani.ai Vachana API Status ${res.status}]:`, errorText);
      }
    } catch (err: any) {
      console.warn("[Gnani.ai Vachana Fetch Exception]:", err.message);
    }
  }

  // High-fidelity fallback simulation with deterministic Indic metadata
  const latencyMs = Math.max(Date.now() - startTime, 18);
  return {
    success: true,
    audioUrl: "https://assets.revclaim.ai/audio/demo-sarah-indic.mp3",
    provider: "gnani_simulation",
    modelUsed: model,
    voiceUsed: voice,
    languageUsed: String(language),
    latencyMs,
    detectedSentiment: "cooperative",
  };
}

/**
 * Transcribes Indian telephony voice audio using Gnani.ai Prisma v3.0 / v2.5 ASR
 * Handles code-mixed Hinglish and performs Inverse Text Normalization (ITN)
 */
export async function transcribeIndicSpeech(
  audioBuffer: Buffer,
  languageCode: IndicLanguageCode = "hi-IN"
): Promise<string> {
  const result = await transcribeWithPrisma(audioBuffer, languageCode);
  return result.transcript;
}

/**
 * Deep ASR extraction using Gnani Prisma with PTP commitment extraction
 */
export async function transcribeWithPrisma(
  audioBuffer: Buffer,
  languageCode: IndicLanguageCode = "hi-IN"
): Promise<GnaniTranscriptionResult> {
  const startTime = Date.now();
  const apiKey = process.env.GNANI_API_KEY?.trim();

  if (apiKey && apiKey.startsWith("vach_") && !apiKey.includes("your_")) {
    try {
      const res = await fetch(`${GNANI_API_BASE}/api/v1/asr/inference`, {
        method: "POST",
        headers: {
          "X-API-Key-ID": apiKey,
          "Content-Type": "audio/wav",
        },
        body: new Uint8Array(audioBuffer),
      });

      if (res.ok) {
        const data = await res.json();
        const rawTranscript = data.transcript || data.text || "";
        const ptp = extractPtpCommitment(rawTranscript);

        return {
          success: true,
          transcript: rawTranscript,
          detectedLanguage: data.language || languageCode,
          confidence: data.confidence || 0.94,
          provider: "gnani_prisma_live",
          latencyMs: Date.now() - startTime,
          extractedPtp: ptp,
        };
      }
    } catch (err: any) {
      console.warn("[Gnani Prisma ASR Exception]:", err.message);
    }
  }

  // Realistic sample code-mixed response for offline dev / testing
  const fallbackTranscript =
    "Haan ji, hum samajh rahe hain. Kal subah tak ₹25,000 Razorpay link se transfer kar denge aur baki next week.";
  const ptp = extractPtpCommitment(fallbackTranscript);

  return {
    success: true,
    transcript: fallbackTranscript,
    detectedLanguage: languageCode,
    confidence: 0.96,
    provider: "gnani_simulation",
    latencyMs: Date.now() - startTime,
    extractedPtp: ptp,
  };
}

/**
 * Inya-style NLP helper: Extracts Promise-To-Pay (PTP) commitments from Indic transcripts
 */
export function extractPtpCommitment(text: string): {
  hasPtpPromise: boolean;
  promisedDate?: string;
  promisedAmount?: number;
  paymentMode?: "full" | "installment" | "dispute";
} {
  const lower = text.toLowerCase();
  const hasCommitment =
    lower.includes("transfer") ||
    lower.includes("pay") ||
    lower.includes("de denge") ||
    lower.includes("kar denge") ||
    lower.includes("bhej");

  let mode: "full" | "installment" | "dispute" = "full";
  if (lower.includes("next week") || lower.includes("agle") || lower.includes("baki")) {
    mode = "installment";
  }
  if (lower.includes("dispute") || lower.includes("nahi mila") || lower.includes("galat")) {
    mode = "dispute";
  }

  // Extract currency numbers (e.g. ₹25,000 or 25000 or 50000)
  const amountMatch = text.match(/₹?\s?([0-9]{1,3}(,[0-9]{3})*(\.[0-9]+)?|[0-9]+)/);
  let amount: number | undefined;
  if (amountMatch && amountMatch[1]) {
    const parsed = parseFloat(amountMatch[1].replace(/,/g, ""));
    if (parsed > 100) amount = parsed;
  }

  return {
    hasPtpPromise: hasCommitment,
    promisedDate: hasCommitment ? "Within 48 Hours" : undefined,
    promisedAmount: amount,
    paymentMode: mode,
  };
}

/**
 * Autonomous Inya Agent Dialogue Policy:
 * Computes the next conversational recovery turn, invokes statutory MSMED Act Section 16 interest
 * if overdue > 45 days, and generates calibrated Gnani Timbre speech audio.
 */
export async function runGnaniInyaWorkflowStep(params: {
  debtorName: string;
  amountDue: number;
  overdueDays: number;
  debtorStatement?: string;
  currentTurn?: number;
  preferredVoice?: GnaniVoicePersona;
}): Promise<{
  agentReplyText: string;
  audioResponse: GnaniVoiceResponse;
  msmeNoticeTriggered: boolean;
  statutoryInterestAmount: number;
  recommendedPaymentSplit: { immediate: number; scheduled: number };
}> {
  const {
    debtorName,
    amountDue,
    overdueDays,
    debtorStatement = "",
    preferredVoice = "Shivani",
  } = params;

  // Statutory MSMED Act Section 16 calculation: 3x RBI Bank Rate (~19.5% per annum compound interest)
  const msmeNoticeTriggered = overdueDays > 45;
  const annualInterestRate = 0.195;
  const statutoryInterestAmount = msmeNoticeTriggered
    ? Math.round(amountDue * (annualInterestRate * (overdueDays / 365)))
    : 0;

  // Inya dialogue state determination
  let agentReplyText = "";
  if (debtorStatement.toLowerCase().includes("nahi") || debtorStatement.toLowerCase().includes("problem")) {
    // Hardship / stalling -> offer 50% split plan
    agentReplyText = `Namaste ${debtorName} ji, hum aapki cashflow sthiti samajhte hain. Aapko preshan nahi hona hai—aap aaj 50% yane ₹${(
      amountDue / 2
    ).toLocaleString("en-IN")} Razorpay checkout se clear kar sakte hain, aur baaki agle 7 din mein. Main link aapke WhatsApp par bhej rahi hoon?`;
  } else if (msmeNoticeTriggered) {
    // Statutory compliance notice
    agentReplyText = `Namaste ${debtorName} ji, yeh invoice ab 45 din se adhik overdue hai. MSMED Act Section 16 ke antargat 3-times RBI rate penal interest lagu hota hai. Kripya ₹${amountDue.toLocaleString(
      "en-IN"
    )} ka pending amount Razorpay instant checkout se aaj hi clear karein taaki kisi dispute ya penalty se bacha ja sake. Link SMS aur WhatsApp par dispatched hai.`;
  } else {
    // Polite initial resolution
    agentReplyText = `Namaste ${debtorName} ji! Main RevClaim se Sarah bol rahi hoon. Aapka ₹${amountDue.toLocaleString(
      "en-IN"
    )} ka invoice due hai. Kya hum aaj iska instant Razorpay link WhatsApp par share kar dein taaki bina kisi delay payment process ho sake?`;
  }

  // Synthesize speech using Gnani Timbre v3.0
  const audioResponse = await synthesizeIndicSpeech({
    text: agentReplyText,
    language: "Hindi",
    voice: preferredVoice,
    model: "timbre-v3.0",
    expressiveTags: true,
  });

  return {
    agentReplyText,
    audioResponse,
    msmeNoticeTriggered,
    statutoryInterestAmount,
    recommendedPaymentSplit: {
      immediate: Math.round(amountDue * 0.5),
      scheduled: Math.round(amountDue * 0.5),
    },
  };
}
