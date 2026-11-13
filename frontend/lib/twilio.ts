import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { createVoiceSession, normalizeVoiceLanguage, VoiceAccess, VoiceLanguage, VoiceServiceError } from "./voice-client";

export interface TwilioCallParams {
  to: string;
  invoiceId: string;
  invoiceNumber?: string;
  amount?: number;
  clientName?: string;
  deliverable?: string;
  language?: string;
  callbackUrl?: string;
  contactId?: string;
  requestId?: string;
  access?: VoiceAccess;
}

export interface TwilioCallResponse {
  success: boolean;
  callSid?: string;
  sessionId?: string;
  status: "queued" | "ringing" | "in-progress" | "failed" | "unconfigured";
  provider: "twilio_live" | "unconfigured";
  error?: string;
}

export function publicVoiceBaseUrl(): string {
  const configured = process.env.VOICE_PUBLIC_BASE_URL || process.env.PUBLIC_APP_URL || process.env.TUNNEL_URL;
  if (!configured) throw new VoiceServiceError("A public voice callback URL is required.");
  const url = new URL(configured);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !["", "/"].includes(url.pathname)) {
    throw new VoiceServiceError("Voice callback URL must be a public HTTPS origin.");
  }
  return url.origin;
}

/** Verify using configured public origin. Never trust a forwarded Host header. */
export function validateTwilioWebhook(requestUrl: string, signature: string | null, fields: URLSearchParams): boolean {
  if (process.env.SKIP_TWILIO_VALIDATION === "true") return true;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !signature) return false;
  try {
    const incoming = new URL(requestUrl);
    let payload = `${publicVoiceBaseUrl()}${incoming.pathname}${incoming.search}`;
    const keys = [...new Set(fields.keys())].sort();
    for (const key of keys) {
      const values = fields.getAll(key);
      if (values.length !== 1) return false;
      payload += key + values[0];
    }
    const expected = createHmac("sha1", token).update(payload).digest("base64");
    const supplied = Buffer.from(signature);
    const expectedBytes = Buffer.from(expected);
    return supplied.length === expectedBytes.length && timingSafeEqual(supplied, expectedBytes);
  } catch {
    return false;
  }
}

export function escapeVoiceXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** High-EQ natural voice audio transport using ElevenLabs ultra-realistic multilingual TTS. */
export function renderGatherReply(input: {
  reply: string;
  language: VoiceLanguage;
  sessionId: string;
  sequence: number;
  stateVersion: number;
  endCall: boolean;
}): string {
  const locale = input.language === "hi-en" ? "hi-IN" : "en-IN";
  const baseUrl = publicVoiceBaseUrl();
  const ttsUrl = new URL("/api/tts", baseUrl);
  ttsUrl.searchParams.set("text", input.reply);
  ttsUrl.searchParams.set("lang", input.language);
  const playAudio = `<Play>${escapeVoiceXml(ttsUrl.toString())}</Play>`;

  if (input.endCall) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response>${playAudio}<Hangup/></Response>`;
  }

  const action = new URL("/api/twilio/voice/respond", baseUrl);
  action.searchParams.set("sessionId", input.sessionId);
  action.searchParams.set("sequence", String(input.sequence + 1));
  action.searchParams.set("stateVersion", String(input.stateVersion));

  const hints = "Nishant, Maurya, Nishant Maurya, Yes, Haan, Ji, Ji haan, Ok, Okay, Kar sakta hoon, Later, Baad mein, Invoice, Payment, Pay, Kal, Tomorrow, WhatsApp, Email, Link, 45000, 45 hazar, Bhej do, Done, Already paid, Dispute, Hello, Kaun, Sun raha hoon, Baat kar sakte hain, Boliye, Not audible, Awaz nahi aa rahi";

  // Crucial: Place <Play> BEFORE <Gather> so audio plays to completion without premature barge-in cutoff
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${playAudio}<Gather input="speech" action="${escapeVoiceXml(action.toString())}" method="POST" actionOnEmptyResult="true" speechTimeout="auto" timeout="6" speechModel="phone_call" hints="${escapeVoiceXml(hints)}" language="${locale}"></Gather></Response>`;
}

export function renderVoiceFailure(language: VoiceLanguage = "en-IN"): string {
  const reply = language === "hi-en" ? "Maaf kijiye, abhi call continue nahi ho pa rahi. Main call end karti hoon." : "Sorry, I cannot continue this call right now. I'll end the call.";
  try {
    const ttsUrl = new URL("/api/tts", publicVoiceBaseUrl());
    ttsUrl.searchParams.set("text", reply);
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Play>${escapeVoiceXml(ttsUrl.toString())}</Play><Hangup/></Response>`;
  } catch {
    const locale = language === "hi-en" ? "hi-IN" : "en-IN";
    const voice = language === "hi-en" ? "Polly.Aditi" : "Polly.Kajal-Neural";
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="${voice}" language="${locale}">${escapeVoiceXml(reply)}</Say><Hangup/></Response>`;
  }
}

export async function initiateTwilioOutboundCall(params: TwilioCallParams): Promise<TwilioCallResponse> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, status: "unconfigured", provider: "unconfigured", error: "Twilio is not configured." };
  }
  try {
    const target = params.to.replace(/\s+/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(target)) throw new VoiceServiceError("A valid authorized phone number is required.", 400);
    const callback = new URL("/api/twilio/voice", publicVoiceBaseUrl());
    const session = await createVoiceSession({
      invoice_id: params.invoiceId,
      contact_id: params.contactId,
      language_mode: normalizeVoiceLanguage(params.language),
      transport: "twilio",
      request_id: params.requestId || randomUUID(),
    }, params.access || {});
    callback.searchParams.set("sessionId", session.session_id);
    const body = new URLSearchParams({ To: target, From: fromNumber, Url: callback.toString() });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { success: false, status: "failed", provider: "twilio_live", sessionId: session.session_id, error: "Carrier rejected the call request." };
    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null || !("sid" in data) || typeof data.sid !== "string" || !/^CA[a-fA-F0-9]{32}$/.test(data.sid)) {
      throw new VoiceServiceError("Carrier returned an invalid call identifier.");
    }
    const carrierStatus = "status" in data ? data.status : "queued";
    const status = carrierStatus === "ringing" || carrierStatus === "in-progress" ? carrierStatus : "queued";
    return { success: true, callSid: data.sid, sessionId: session.session_id, status, provider: "twilio_live" };
  } catch (error) {
    return { success: false, status: "failed", provider: "twilio_live", error: error instanceof VoiceServiceError ? error.message : "Call request failed or its outcome is unknown. Check carrier status before retrying." };
  }
}
