import { NextRequest, NextResponse } from "next/server";
import { createVoiceSession, getVoiceSession, normalizeVoiceLanguage, submitVoiceTurn, VoiceServiceError } from "@/lib/voice-client";

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ") || !authorization.slice(7).trim()) {
      return NextResponse.json({ success: false, error: "Sign in to start a voice session." }, { status: 401 });
    }
    const access = { accessToken: authorization.slice(7).trim() };
    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new VoiceServiceError("Invalid request.", 400);
    const values = body as Record<string, unknown>;
    const started = Date.now();
    let result;
    if (values.operation === "start") {
      const invoiceId = text(values.invoiceId);
      const requestId = text(values.requestId);
      if (!invoiceId || !requestId) throw new VoiceServiceError("Invoice and request ID are required.", 400);
      result = await createVoiceSession({
        invoice_id: invoiceId,
        contact_id: text(values.contactId),
        language_mode: normalizeVoiceLanguage(text(values.language)),
        transport: "browser",
        request_id: requestId,
      }, access);
    } else {
      const sessionId = text(values.sessionId);
      if (!sessionId) throw new VoiceServiceError("Start a session before sending a message.", 400);
      if (values.operation === "snapshot") {
        result = await getVoiceSession(sessionId, access);
      } else {
        const transcript = text(values.message) || text(values.clientLastMessage);
        const eventId = text(values.eventId);
        if (!transcript || transcript.length > 4000 || !eventId ||
            !Number.isInteger(values.sequence) || Number(values.sequence) < 1 ||
            !Number.isInteger(values.observedStateVersion) || Number(values.observedStateVersion) < 0) {
          throw new VoiceServiceError("Message, event ID and current session version are required.", 400);
        }
        result = await submitVoiceTurn(sessionId, {
          event_id: eventId,
          transcript,
          sequence: Number(values.sequence),
          observed_state_version: Number(values.observedStateVersion),
          ...(text(values.language) ? { language_mode: normalizeVoiceLanguage(text(values.language)) } : {}),
        }, access);
      }
    }
    return NextResponse.json({
      ...result,
      success: true,
      sessionId: result.session_id,
      modelUsed: result.model_used || "shared-controller",
      latencyMs: Date.now() - started,
      emailDispatched: false,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof VoiceServiceError ? error.status : error instanceof SyntaxError ? 400 : 503;
    return NextResponse.json({ success: false, error: error instanceof VoiceServiceError ? error.message : "Voice request could not be completed." }, { status });
  }
}
