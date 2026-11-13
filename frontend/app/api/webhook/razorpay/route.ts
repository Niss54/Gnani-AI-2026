import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyRazorpayWebhookSignature(rawBody, req.headers.get("x-razorpay-signature")).valid) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }
  // Acknowledge only after durable, tenant-scoped reconciliation exists.
  return NextResponse.json({ success: false, error: "Authoritative payment reconciliation is not configured." }, { status: 503 });
}
