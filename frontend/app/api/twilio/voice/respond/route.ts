import { NextRequest, NextResponse } from "next/server";
import { getVoiceSession, submitVoiceTurn, VoiceLanguage } from "@/lib/voice-client";
import { renderGatherReply, renderHandoff, renderVoiceFailure, validateTwilioWebhook } from "@/lib/twilio";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const fields = new URLSearchParams(await req.text());
  if (!validateTwilioWebhook(req.url, req.headers.get("x-twilio-signature"), fields)) {
    return new NextResponse("Invalid webhook signature", { status: 403 });
  }
  let language: VoiceLanguage = "en-IN";
  try {
    const query = new URL(req.url).searchParams;
    const tenantId = query.get("tenantId") || undefined;
    const sessionId = query.get("sessionId");
    const callSid = fields.get("CallSid");
    const sequence = Number(query.get("sequence"));
    const version = Number(query.get("stateVersion"));
    if (!sessionId || !callSid || !Number.isInteger(sequence) || sequence < 1 || !query.has("stateVersion") || !Number.isInteger(version) || version < 0) {
      return new NextResponse("Invalid turn context", { status: 400 });
    }
    const current = await getVoiceSession(sessionId, { tenantId });
    language = current.language_mode;
    if (current.call_sid && current.call_sid !== callSid) return new NextResponse("Call/session mismatch", { status: 403 });
    const result = await submitVoiceTurn(sessionId, {
      event_id: `${callSid}:${sequence}`,
      transcript: fields.get("SpeechResult")?.trim() || "",
      observed_state_version: version,
      sequence,
      call_sid: callSid,
    }, { tenantId });
    const xml = renderHandoff(result.tool_results, callSid) || renderGatherReply({ reply: result.reply, language: result.language_mode, sessionId: result.session_id,
      sequence: result.sequence, stateVersion: result.state_version, tenantId, endCall: result.should_end_call });
    return new NextResponse(xml, { headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" } });
  } catch {
    return new NextResponse(renderVoiceFailure(language), { headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" } });
  }
}
