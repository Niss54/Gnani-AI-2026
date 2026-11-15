import { backendBaseUrl, normalizeVoiceLanguage } from "./voice-client";

export function invoiceAction(action: "call" | "checkout" | "notify") {
  return async (request: Request) => {
    const token = request.headers.get("authorization");
    if (!token || !/^Bearer \S+$/i.test(token)) return Response.json({error: "Sign in first."}, {status: 401});
    const body = await request.json().catch(() => null);
    if (!body || typeof body.invoiceId !== "string" || !/^[\w-]{1,128}$/.test(body.invoiceId)) {
      return Response.json({error: "A valid invoice ID is required."}, {status: 400});
    }
    if (action === "notify" && body.channel && body.channel !== "email") {
      return Response.json({error: "Only verified email delivery is supported."}, {status: 422});
    }
    const requestId = body.requestId || request.headers.get("idempotency-key");
    if (typeof requestId !== "string" || !requestId.trim() || requestId.length > 200) {
      return Response.json({error: "A stable request ID is required."}, {status: 400});
    }
    try {
      const upstream = await fetch(backendBaseUrl() + "/v1/voice/invoices/" + body.invoiceId + "/actions/" + action, {
        method: "POST", headers: {Authorization: token, "Content-Type": "application/json"},
        body: JSON.stringify({request_id: requestId, language_mode: normalizeVoiceLanguage(body.language),
          discount_bps: body.requestedDiscountBps ?? 0}), cache: "no-store", redirect: "error",
      });
      if (!upstream.ok) return Response.json({error: "Invoice action was not confirmed."}, {status: upstream.status});
      return Response.json(await upstream.json(), {status: upstream.status, headers: {"Cache-Control": "no-store"}});
    } catch {
      return Response.json({error: "Invoice service unavailable. Check the existing request before retrying."}, {status: 502});
    }
  };
}
