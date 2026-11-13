/** Server-side adapter to the single voice controller. No invoice facts originate here. */
export type VoiceLanguage = "en-IN" | "hi-en";

export interface VoiceAccess {
  accessToken?: string;
  /** Only a trusted server resolver may supply this field. */
  tenantId?: string;
}

export interface VoiceSnapshot {
  session_id: string;
  reply: string;
  language_mode: VoiceLanguage;
  state: string;
  state_version: number;
  sequence: number;
  call_sid?: string | null;
  outcome?: string | null;
  should_end_call: boolean;
  model_used?: string;
  action_status?: string | null;
  tool_results?: unknown[];
}

export class VoiceServiceError extends Error {
  constructor(message: string, public readonly status: number = 503) {
    super(message);
    this.name = "VoiceServiceError";
  }
}

export function normalizeVoiceLanguage(value?: string | null): VoiceLanguage {
  const language = value?.trim().toLowerCase();
  if (!language || ["en", "en-in", "english", "international_english"].includes(language)) return "en-IN";
  if (["hi", "hi-in", "hi-en", "hindi", "hinglish", "indic_hinglish"].includes(language)) return "hi-en";
  throw new VoiceServiceError("Voice supports English and Hinglish only.", 400);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVoiceSnapshot(value: unknown): value is VoiceSnapshot {
  return isRecord(value) && typeof value.session_id === "string" && value.session_id.length > 0 &&
    typeof value.reply === "string" && (value.language_mode === "en-IN" || value.language_mode === "hi-en") &&
    typeof value.state === "string" && Number.isInteger(value.state_version) && Number.isInteger(value.sequence) &&
    typeof value.should_end_call === "boolean" &&
    (value.call_sid === undefined || value.call_sid === null || typeof value.call_sid === "string");
}

function backendBaseUrl(): string {
  const configured = process.env.VOICE_BACKEND_URL || process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
  if (!configured) throw new VoiceServiceError("Voice backend is not configured.");
  const url = new URL(configured);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new VoiceServiceError("Invalid voice backend configuration.");
  }
  if (url.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new VoiceServiceError("Voice backend requires HTTPS outside localhost.");
  }
  return configured.replace(/\/$/, "");
}

async function requestVoice(path: string, access: VoiceAccess, body?: unknown): Promise<VoiceSnapshot> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (access.accessToken) {
    headers.Authorization = `Bearer ${access.accessToken}`;
  } else {
    const key = process.env.VOICE_INTERNAL_API_KEY;
    if (!key) throw new VoiceServiceError("Internal voice authentication is not configured.");
    headers["X-Voice-Internal-Key"] = key;
    if (access.tenantId) headers["X-Voice-Tenant-Id"] = access.tenantId;
  }
  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl()}/v1/voice${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch (error) {
    if (error instanceof VoiceServiceError) throw error;
    throw new VoiceServiceError("Voice service is temporarily unavailable.");
  }
  if (!response.ok) {
    const safeStatus = [400, 401, 403, 404, 409, 422, 429].includes(response.status) ? response.status : 503;
    throw new VoiceServiceError(safeStatus === 409 ? "Session changed. Refresh before trying again." : "Voice request could not be completed.", safeStatus);
  }
  const data: unknown = await response.json();
  if (!isVoiceSnapshot(data)) throw new VoiceServiceError("Voice service returned an invalid response.");
  return data;
}

export function createVoiceSession(input: {
  invoice_id: string;
  contact_id?: string;
  language_mode: VoiceLanguage;
  transport: "twilio" | "browser";
  request_id: string;
}, access: VoiceAccess): Promise<VoiceSnapshot> {
  if (!input.invoice_id || !input.request_id) throw new VoiceServiceError("Invoice and request ID are required.", 400);
  if (!access.accessToken && !access.tenantId) throw new VoiceServiceError("An authorized tenant is required.", 401);
  return requestVoice("/sessions", access, input);
}

export function getVoiceSession(sessionId: string, access: VoiceAccess): Promise<VoiceSnapshot> {
  return requestVoice(`/sessions/${encodeURIComponent(sessionId)}`, access);
}

export function bindVoiceCall(sessionId: string, callSid: string): Promise<VoiceSnapshot> {
  return requestVoice(`/sessions/${encodeURIComponent(sessionId)}/bind-call`, {}, { call_sid: callSid });
}

export function submitVoiceTurn(sessionId: string, input: {
  event_id: string;
  transcript: string;
  observed_state_version: number;
  sequence: number;
  language_mode?: VoiceLanguage;
  call_sid?: string;
}, access: VoiceAccess): Promise<VoiceSnapshot> {
  return requestVoice(`/sessions/${encodeURIComponent(sessionId)}/turns`, access, input);
}
