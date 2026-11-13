import { NextRequest, NextResponse } from "next/server";
import { bindVoiceCall, getVoiceSession } from "@/lib/voice-client";
import { renderGatherReply, renderVoiceFailure, validateTwilioWebhook } from "@/lib/twilio";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const fields = new URLSearchParams(await req.text());
  if (!validateTwilioWebhook(req.url, req.headers.get("x-twilio-signature"), fields)) {
    return new NextResponse("Invalid webhook signature", { status: 403 });
  }
  try {
    const sessionId = new URL(req.url).searchParams.get("sessionId");
    const callSid = fields.get("CallSid");
    if (!sessionId || !callSid || !/^CA[a-fA-F0-9]{32}$/.test(callSid)) return new NextResponse("Invalid call context", { status: 400 });
    const current = await getVoiceSession(sessionId, {});
    if (current.call_sid && current.call_sid !== callSid) return new NextResponse("Call/session mismatch", { status: 403 });
    const session = await bindVoiceCall(sessionId, callSid);
    const xml = renderGatherReply({ reply: session.reply, language: session.language_mode, sessionId: session.session_id,
      sequence: session.sequence, stateVersion: session.state_version, endCall: session.should_end_call });
    return new NextResponse(xml, { headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" } });
  } catch {
    return new NextResponse(renderVoiceFailure(), { headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" } });
  }
}
