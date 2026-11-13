import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ success: false, error: "Delivery requires a verified recipient, consent and a provider receipt through the voice action executor." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
