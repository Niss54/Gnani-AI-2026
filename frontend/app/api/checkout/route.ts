import { NextRequest, NextResponse } from "next/server";
import { createRazorpayPaymentLink } from "@/lib/razorpay";
import { getInvoiceById } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId, amount, customerEmail, customerName, customerPhone } = body;

    let targetInvoice = null;
    if (invoiceId) {
      targetInvoice = getInvoiceById(invoiceId);
    }

    const payAmount = amount || targetInvoice?.amount || targetInvoice?.amountDue || 50000;
    const email =
      customerEmail ||
      targetInvoice?.debtorEmail ||
      targetInvoice?.debtor?.email ||
      "finance@client.com";
    const name =
      customerName ||
      targetInvoice?.debtorName ||
      targetInvoice?.debtor?.contactPerson ||
      "Valued Client";
    const phone =
      customerPhone ||
      targetInvoice?.debtorPhone ||
      targetInvoice?.debtor?.phone ||
      "+919876543210";
    const invoiceNumber = targetInvoice?.invoiceNumber || invoiceId || "INV-MANUAL";

    const session = await createRazorpayPaymentLink({
      invoiceId: invoiceId || "INV-MANUAL",
      invoiceNumber: invoiceNumber,
      amount: payAmount,
      currency: targetInvoice?.currency || "INR",
      debtorName: name,
      debtorEmail: email,
      debtorPhone: phone,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.paymentUrl,
      paymentId: session.paymentLinkId,
      amount: payAmount,
      currency: "INR",
      gateway: "Razorpay",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create checkout",
      },
      { status: 500 }
    );
  }
}
