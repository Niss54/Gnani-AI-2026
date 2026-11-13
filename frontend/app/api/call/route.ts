import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ success: false, error: "Live dialing requires an authorized stored contact and carrier adapter. Browser sessions use /api/negotiate." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
