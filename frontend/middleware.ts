import { NextRequest, NextResponse } from "next/server";

// Legacy routes read shared demo/helpline stores or expose unscoped provider spend.
// Keep their implementations offline until tenant-scoped replacements are ready.
const unavailable = new Set([
  "/api/invoices", "/api/calls", "/api/escalations", "/api/ptp-audit",
  "/api/gnani/audio", "/api/gnani/stt", "/api/gnani/tts",
]);
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/$/, "");
  if (unavailable.has(pathname) || pathname.startsWith("/api/call/") || pathname.startsWith("/api/py/")) {
    return NextResponse.json({ success: false, error: "This legacy endpoint is unavailable pending tenant-scoped integration." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.next();
}
export const config = { matcher: ["/api/:path*"] };
