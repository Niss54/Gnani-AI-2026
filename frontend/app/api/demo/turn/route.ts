import { backendBaseUrl } from "@/lib/voice-client";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !["hi-en", "en-IN"].includes(body.language) ||
      !Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 12 ||
      body.messages.some((s: unknown) => typeof s !== "string" || !s.trim() || s.length > 500)) {
    return Response.json({error: "Use up to twelve caller turns of 500 characters each."}, {status: 400});
  }
  try {
    const response = await fetch(backendBaseUrl() + "/v1/demo/turn", {
      method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({messages: body.messages, language: body.language}),
      signal: AbortSignal.timeout(12000), redirect: "error", cache: "no-store",
    });
    if (!response.ok) return Response.json({error: "The demo could not process this turn."}, {status: response.status});
    return Response.json(await response.json(), {headers: {"Cache-Control": "no-store"}});
  } catch {
    return Response.json({error: "The demo backend is unavailable. Please try again."}, {status: 503});
  }
}
