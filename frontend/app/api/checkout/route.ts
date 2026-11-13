import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ success: false, error: "Checkout requires the authoritative invoice/payment mapping. Legacy body-supplied amounts are not accepted." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
