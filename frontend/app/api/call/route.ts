import { NextRequest, NextResponse } from "next/server";
import { getInvoiceById } from "@/lib/db";
import { createCallRecord } from "@/lib/call-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { invoiceId } = body;

    if (!invoiceId || typeof invoiceId !== "string") {
      return NextResponse.json(
        { success: false, error: "invoiceId is required" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const invoice = getInvoiceById(invoiceId);
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: `Authoritative invoice not found: ${invoiceId}` },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const debtorPhone = invoice.debtorPhone || invoice.debtor?.phone;
    if (!debtorPhone) {
      return NextResponse.json(
        { success: false, error: "Invoice debtor phone number is missing." },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioSid || !twilioAuth || !twilioFrom || twilioSid.startsWith("your_") || twilioAuth.startsWith("your_")) {
      // Create registered session record for browser/telephony bridge
      const call = createCallRecord({
        invoiceId: invoice.id,
        debtorName: invoice.debtorName || invoice.debtor?.contactPerson || "Debtor",
        debtorPhone,
        mode: "live",
      });

      return NextResponse.json(
        {
          success: true,
          status: "session_created",
          callId: call.id,
          invoiceId: invoice.id,
          phone: debtorPhone,
          transport: "browser_voice_bridge",
          notice: "Carrier PSTN requires configured TWILIO_ACCOUNT_SID; session available via /api/negotiate.",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Live Twilio outbound call dispatch
    const authHeader = Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64");
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://revclaim.ai"}/api/twilio/voice`;

    const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: debtorPhone,
        From: twilioFrom,
        Url: webhookUrl,
      }),
    });

    if (!twilioRes.ok) {
      const errText = await twilioRes.text();
      return NextResponse.json(
        { success: false, error: `Carrier gateway rejected call: ${twilioRes.status} ${errText}` },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const twilioData = await twilioRes.json();
    const call = createCallRecord({
      invoiceId: invoice.id,
      debtorName: invoice.debtorName || invoice.debtor?.contactPerson || "Debtor",
      debtorPhone,
      mode: "live",
      callSid: twilioData.sid,
    });

    return NextResponse.json(
      {
        success: true,
        callId: call.id,
        callSid: twilioData.sid,
        status: twilioData.status,
        invoiceId: invoice.id,
        phone: debtorPhone,
        carrier: "twilio_pstn",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error initiating call" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
