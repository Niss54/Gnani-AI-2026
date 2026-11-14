import { NextRequest, NextResponse } from "next/server";
import { getInvoiceById } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { invoiceId, channel = "email" } = body;

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

    if (channel !== "email") {
      return NextResponse.json(
        { success: false, error: `Channel '${channel}' requires carrier integration adapter.` },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }

    const recipientEmail = invoice.debtorEmail || invoice.debtor?.email;
    if (!recipientEmail || !recipientEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Invoice debtor email is missing or invalid." },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey || resendKey.startsWith("your_")) {
      return NextResponse.json(
        { success: false, error: "Delivery provider unconfigured: RESEND_API_KEY required." },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RevClaim Accounts <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: `Statement of Account: Invoice #${invoice.invoiceNumber} (${invoice.currency} ${invoice.amountDue}) — RevClaim AI`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0f172a;">Invoice Statement of Account</h2>
            <p>Dear ${invoice.debtorName || "Client"},</p>
            <p>This is a formal statement regarding outstanding invoice <strong>${invoice.invoiceNumber}</strong>.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Invoice ID:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${invoice.invoiceNumber}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Amount Due:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${invoice.currency} ${invoice.amountDue?.toLocaleString()}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Due Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${invoice.dueDate}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Status:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${invoice.status}</td></tr>
            </table>
            <p>Please settle the outstanding balance via authorized payment rail or contact accounts management for assistance.</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      return NextResponse.json(
        { success: false, error: `Delivery provider rejected email: ${emailRes.status} ${errText}` },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const emailData = await emailRes.json();
    return NextResponse.json(
      {
        success: true,
        channel: "email",
        messageId: emailData.id,
        recipient: recipientEmail,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error dispatching notification" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
