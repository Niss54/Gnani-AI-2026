import { NextRequest, NextResponse } from "next/server";
import { runGnaniInyaWorkflowStep } from "@/lib/gnani";

/**
 * Gnani.ai Autonomous Inya Agent Receivables Negotiation Endpoint
 * Combines Indic sentiment analysis, statutory MSMED Act Section 16 interest calculation,
 * and live Gnani Timbre speech synthesis into a single turn.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      debtorName = "Client",
      amountDue = 50000,
      overdueDays = 52,
      debtorStatement = "",
      preferredVoice = "Shivani",
    } = body;

    const result = await runGnaniInyaWorkflowStep({
      debtorName,
      amountDue: Number(amountDue),
      overdueDays: Number(overdueDays),
      debtorStatement,
      preferredVoice,
    });

    return NextResponse.json({
      success: true,
      agentReplyText: result.agentReplyText,
      audioResponse: result.audioResponse,
      msmeNoticeTriggered: result.msmeNoticeTriggered,
      statutoryInterestAmount: result.statutoryInterestAmount,
      recommendedPaymentSplit: result.recommendedPaymentSplit,
    });
  } catch (error: any) {
    console.error("[Gnani Inya Negotiation Route Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process negotiation step" },
      { status: 500 }
    );
  }
}
