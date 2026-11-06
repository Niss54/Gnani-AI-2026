import { NextRequest, NextResponse } from "next/server";
import { markInvoicePaid, getInvoiceById } from "@/lib/db";
import { dispatchWhatsAppPaymentLink } from "@/lib/mcp";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";

/**
 * Razorpay Webhook Ingestion Route
 * Handles payment_link.paid, payment.captured, order.paid
 * Automatically reconciles invoices in the database and triggers receipt notifications.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    // 1. Cryptographic HMAC-SHA256 Webhook Verification
    const verification = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!verification.valid) {
      console.warn(`[Razorpay Webhook 401] Unauthorized webhook: ${verification.reason}`);
      return NextResponse.json(
        { error: "Unauthorized: Invalid Razorpay webhook signature", reason: verification.reason },
        { status: 401 }
      );
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const eventType = event.event || event.type;
    const payload = event.payload || {};

    console.log(`[Razorpay Webhook] Received event: ${eventType}`);

    // Extract entity details (either from payment_link or payment or order)
    const paymentLinkEntity = payload.payment_link?.entity;
    const paymentEntity = payload.payment?.entity;
    const orderEntity = payload.order?.entity;

    const notes =
      paymentLinkEntity?.notes ||
      paymentEntity?.notes ||
      orderEntity?.notes ||
      event.notes ||
      {};

    const invoiceId = notes.invoiceId || notes.invoice_id;

    if (
      eventType === "payment_link.paid" ||
      eventType === "payment.captured" ||
      eventType === "order.paid"
    ) {
      let settledInvoice: any = null;

      if (invoiceId) {
        let rawAmount: number | undefined = undefined;
        const paidPaise =
          paymentLinkEntity?.amount_paid ||
          paymentEntity?.amount ||
          orderEntity?.amount_paid;

        if (typeof paidPaise === "number") {
          rawAmount = paidPaise / 100; // Convert paise to INR
        }

        settledInvoice = markInvoicePaid(invoiceId, rawAmount);

        if (settledInvoice) {
          const receiptUrl = `https://rzp.io/r/${settledInvoice.id.slice(0, 8)}`;
          // Trigger receipt dispatch via WhatsApp
          await dispatchWhatsAppPaymentLink(
            settledInvoice.debtorPhone || settledInvoice.debtor?.phone || "+919876543210",
            settledInvoice.debtorName || settledInvoice.debtor?.contactPerson || "Client",
            settledInvoice.recoveredAmount || settledInvoice.amountDue || 50000,
            receiptUrl
          );
        }
      }

      return NextResponse.json({
        success: true,
        received: true,
        status: "settled",
        event: eventType,
        invoice: settledInvoice,
        monetization: {
          invoiceId: settledInvoice?.id,
          invoiceNumber: settledInvoice?.invoiceNumber,
          debtorName: settledInvoice?.debtorName || settledInvoice?.debtor?.contactPerson,
          currency: settledInvoice?.currency || "INR",
          grossRecovered: settledInvoice?.recoveredAmount ?? 0,
          revclaimPlatformFee: settledInvoice?.revclaimFeeDeducted ?? 0,
          feeModel: "Flat ₹475 Platform Settlement Fee ($5 equivalent)",
          gstOnFee18Pct: Math.round((settledInvoice?.revclaimFeeDeducted ?? 0) * 0.18),
          netRemittanceToFreelancer: settledInvoice?.netPayoutToUser ?? 0,
          payoutStatus: settledInvoice?.payoutStatus ?? "REMITTED",
          paymentGateway: "Razorpay Payments (India UPI / Cards / NetBanking)",
          remittanceMechanism: "Instant RBI-Compliant Direct Account Remittance",
        },
      });
    }

    return NextResponse.json({ success: true, ignored: true, event: eventType });
  } catch (error: any) {
    console.error("[Razorpay Webhook Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}
