import { NextRequest, NextResponse } from "next/server";
import { createRazorpayPaymentLink } from "@/lib/razorpay";
import { getInvoiceById } from "@/lib/db";
import { INITIAL_INVOICES } from "@/lib/demo-data";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await context.params;

    // Look up invoice details
    let invoice = getInvoiceById(invoiceId);
    if (!invoice) {
      invoice =
        INITIAL_INVOICES.find(
          (i) =>
            i.id === invoiceId ||
            i.invoiceNumber.toLowerCase() === invoiceId.toLowerCase()
        ) || null;
    }

    const amount = invoice?.amountDue || invoice?.amount || 50000;
    const email =
      invoice?.debtorEmail ||
      invoice?.debtor?.email ||
      "nishantma05@gmail.com";
    const name =
      invoice?.debtorName ||
      invoice?.debtor?.contactPerson ||
      "Valued Client";
    const phone =
      invoice?.debtorPhone ||
      invoice?.debtor?.phone ||
      "+919876543210";
    const invoiceNumber = invoice?.invoiceNumber || invoiceId || "INV-1042";

    // Provision an instant Razorpay payment link
    const session = await createRazorpayPaymentLink({
      invoiceId: invoiceId || "INV-1042",
      invoiceNumber,
      amount,
      debtorEmail: email,
      debtorName: name,
      debtorPhone: phone,
      currency: invoice?.currency || "INR",
    });

    if (session?.paymentUrl) {
      return NextResponse.redirect(session.paymentUrl, 307);
    }

    return NextResponse.redirect(
      `https://rzp.io/i/${invoiceNumber.toLowerCase()}`,
      307
    );
  } catch (error) {
    console.error("[Pay Route Error]:", error);
    return NextResponse.redirect("https://rzp.io/i/demo_pay", 307);
  }
}
