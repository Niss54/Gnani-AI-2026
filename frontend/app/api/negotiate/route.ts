import { NextRequest, NextResponse } from "next/server";
import { generateNegotiationTurn, NegotiationContext } from "@/lib/llm";
import { sendRecoveryEmail } from "@/lib/resend";
import { createRazorpayPaymentLink } from "@/lib/razorpay";

function shouldDispatchEmail(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return (
    t.includes("email") ||
    t.includes("mail") ||
    t.includes("inbox") ||
    t.includes("ईमेल") ||
    t.includes("मेल") ||
    t.includes("कुल्ड यू शेयर") ||
    t.includes("पेमेंट लिंक") ||
    t.includes("payment link") ||
    t.includes("send link") ||
    t.includes("share link") ||
    t.includes("लिंक भेज") ||
    t.includes("link bhej")
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const debtorEmail = body.debtorEmail || body.email || "nishantma05@gmail.com";

    const ctx: NegotiationContext = {
      debtorName: body.debtorName || "Rahul Sharma",
      debtorCompany: body.debtorCompany || "Acme Creative Studios",
      debtorEmail,
      invoiceNumber: body.invoiceNumber || "INV-1042",
      amountDue: Number(body.amountDue || body.amount || 45000),
      currency: body.currency || "INR",
      daysOverdue: Number(body.daysOverdue || 14),
      deliverable: body.deliverable || "Figma UI/UX Design System",
      freelancerName: body.freelancerName || "Nishant Maurya",
      conversationHistory: Array.isArray(body.conversationHistory) ? body.conversationHistory : [],
      clientLastMessage: body.clientLastMessage || body.message || "Hello",
    };

    const startTime = Date.now();
    const result = await generateNegotiationTurn(ctx);
    const totalLatency = Date.now() - startTime;

    // Autonomous Email Action: If the client requests the link or email, dispatch real Resend email
    let emailDispatched = false;
    let deliveredTo = debtorEmail;
    let emailMessageId: string | undefined;

    if (shouldDispatchEmail(ctx.clientLastMessage)) {
      let paymentLink = `https://rzp.io/i/${ctx.invoiceNumber.toLowerCase()}`;
      try {
        const rzpRes = await createRazorpayPaymentLink({
          invoiceId: ctx.invoiceNumber,
          invoiceNumber: ctx.invoiceNumber,
          amount: ctx.amountDue,
          debtorEmail: debtorEmail,
          debtorName: ctx.debtorName,
        });
        if (rzpRes?.paymentUrl) {
          paymentLink = rzpRes.paymentUrl;
        }
      } catch (rzpErr) {
        console.warn("[API Negotiate] Razorpay payment link fallback:", rzpErr);
      }

      try {
        const resendRes = await sendRecoveryEmail({
          to: debtorEmail,
          clientName: ctx.debtorName,
          amount: ctx.amountDue,
          invoiceNumber: ctx.invoiceNumber,
          paymentLink,
          deliverable: ctx.deliverable,
          debtorCompany: ctx.debtorCompany,
          daysOverdue: ctx.daysOverdue,
          forceSend: true,
        });

        if (resendRes.success) {
          emailDispatched = true;
          deliveredTo = resendRes.recipient;
          emailMessageId = resendRes.messageId;
        }
      } catch (err: any) {
        console.error("[API Negotiate Email Dispatch Error]:", err?.message);
      }
    }

    return NextResponse.json({
      success: true,
      reply: result.reply,
      modelUsed: result.modelUsed,
      latencyMs: result.latencyMs || totalLatency,
      emailDispatched,
      deliveredTo,
      emailMessageId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API Negotiate Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to generate negotiation turn",
      },
      { status: 500 }
    );
  }
}
