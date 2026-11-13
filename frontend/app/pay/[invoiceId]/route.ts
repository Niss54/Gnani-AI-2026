import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ success: false, error: "This legacy payment redirect is unavailable. Contact the business for a verified payment link." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
