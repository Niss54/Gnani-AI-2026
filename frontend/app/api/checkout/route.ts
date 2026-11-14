import { NextRequest, NextResponse } from "next/server";
import { getInvoiceById } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { invoiceId, requestedDiscountBps } = body;

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

    // Never accept client-supplied arbitrary amount/currency; use authoritative ledger
    let finalAmount = invoice.amountDue || invoice.amount || 0;
    let discountAppliedBps = 0;

    if (typeof requestedDiscountBps === "number" && requestedDiscountBps > 0) {
      // Mandate limit: maximum discount allowed is 1000 bps (10%) unless explicitly higher
      const maxDiscountBps = 1000;
      if (requestedDiscountBps > maxDiscountBps) {
        return NextResponse.json(
          {
            success: false,
            error: `Requested discount (${requestedDiscountBps} bps) exceeds authorized mandate maximum (${maxDiscountBps} bps).`,
          },
          { status: 422, headers: { "Cache-Control": "no-store" } }
        );
      }
      discountAppliedBps = requestedDiscountBps;
      const discountAmount = Math.round((finalAmount * discountAppliedBps) / 10000);
      finalAmount -= discountAmount;
    }

    const currency = (invoice.currency || "INR").toUpperCase();
    const finalAmountMinor = Math.round(finalAmount * 100);

    const rzpKey = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET;

    if (!rzpKey || !rzpSecret || rzpKey.startsWith("your_") || rzpSecret.startsWith("your_")) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment provider unconfigured: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET required for live checkout links.",
        },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }

    const authHeader = Buffer.from(`${rzpKey}:${rzpSecret}`).toString("base64");
    const rzpRes = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        amount: finalAmountMinor,
        currency,
        accept_partial: false,
        description: `Payment for Invoice #${invoice.invoiceNumber} via RevClaim AI`,
        customer: {
          name: invoice.debtorName || invoice.debtor?.contactPerson || "Valued Client",
          email: invoice.debtorEmail || invoice.debtor?.email || "finance@clientcorp.com",
          contact: invoice.debtorPhone || invoice.debtor?.phone || "+918840301998",
        },
        notify: { sms: false, email: false }, // Invariant: no unconsented notifications
        reminder_enable: false,
        notes: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        },
      }),
    });

    if (!rzpRes.ok) {
      const errBody = await rzpRes.text();
      return NextResponse.json(
        { success: false, error: `Payment provider rejected request: ${rzpRes.status} ${errBody}` },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const rzpData = await rzpRes.json();
    return NextResponse.json(
      {
        success: true,
        paymentLinkId: rzpData.id,
        checkoutUrl: rzpData.short_url,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: finalAmount,
        currency,
        discountAppliedBps,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error processing checkout" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
