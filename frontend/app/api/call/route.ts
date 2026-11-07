import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orchestrateRecoveryCall } from "@/lib/voice-orchestrator";
import { createCallRecord, completeCallRecord } from "@/lib/call-store";
import { buildSimulatedCallResult } from "@/lib/demo-call";
import { triggerMcpRecoveryActions } from "@/lib/mcp";
import { sendRecoveryEmail } from "@/lib/resend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId, mode = "live", channel = "auto", phone: customPhone } = body;

    let invoice = invoiceId ? db.getInvoice(invoiceId) : null;
    if (!invoice) {
      // Fallback create temporary test invoice for custom testing
      invoice = {
        id: invoiceId || "inv-custom-live",
        invoiceNumber: "INV-2026-LIVE",
        amountDue: body.amount || 5000,
        amount: body.amount || 5000,
        dueDate: new Date().toISOString(),
        currency: "INR",
        debtorName: body.clientName || "Valued Debtor",
        debtorPhone: customPhone || "+918840301998",
        status: "OVERDUE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Clone so we don't mutate unexpectedly
      invoice = { ...invoice };
    }

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (customPhone) {
      invoice.debtorPhone = customPhone;
      if (invoice.debtor) invoice.debtor.phone = customPhone;
    }

    db.updateInvoiceStatus(invoice.id, "CALLING");

    // Autonomous Voice Follow-Up: Dispatch live payment link email via Resend
    const paymentUrl =
      invoice.paymentLinkUrl ||
      `https://rzp.io/i/${invoice.invoiceNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const targetEmail = invoice.debtorEmail || invoice.debtor?.email || "nishantma05@gmail.com";
    const clientName = invoice.debtorName || invoice.debtor?.contactPerson || "Debtor";
    const amount = Number(invoice.amountDue || invoice.amount || 5000);

    sendRecoveryEmail({
      to: targetEmail,
      clientName,
      amount,
      invoiceNumber: invoice.invoiceNumber,
      paymentLink: paymentUrl,
      subject: `Payment Link: Invoice #${invoice.invoiceNumber} for ${clientName} (₹${amount.toLocaleString("en-IN")})`,
    }).catch((err) => console.warn("[Auto Call Email Dispatch Error]:", err?.message));

    if (mode === "demo") {
      const callRecord = createCallRecord({
        invoiceId: invoice.id,
        debtorName: invoice.debtor?.contactPerson || invoice.debtorName || "Client",
        debtorPhone: invoice.debtorPhone || "+918840301998",
        mode: "demo",
        conversationId: `sim_conv_${Date.now()}`
      });

      const result = buildSimulatedCallResult(invoice);
      completeCallRecord(callRecord.id, result);
      db.updateInvoiceStatus(invoice.id, "PTP_AGREED", {
        ptpAmount: result.ptpAmount,
        ptpDate: result.ptpDate
      });

      await triggerMcpRecoveryActions(invoice, invoice.paymentLinkUrl || "https://rzp.io/i/demo_pay");

      return NextResponse.json({
        success: true,
        call: {
          ...callRecord,
          status: "completed",
          result
        }
      });
    }

    // Live Voice Call (Twilio PSTN or LiveKit WebRTC)
    const voiceResult = await orchestrateRecoveryCall({
      invoice,
      preferredChannel: channel === "webrtc" ? "webrtc_browser" : "phone",
    });

    if (voiceResult.status === "failed" || voiceResult.status === "unconfigured") {
      return NextResponse.json({
        success: false,
        status: voiceResult.status,
        error: voiceResult.error || "Outbound call failed",
        channel: voiceResult.channel,
        phone: invoice.debtorPhone,
      }, { status: 400 });
    }

    const callRecord = createCallRecord({
      invoiceId: invoice.id,
      debtorName: invoice.debtor?.contactPerson || invoice.debtorName || "Client",
      debtorPhone: invoice.debtorPhone || "+918840301998",
      mode: "live",
      conversationId: voiceResult.sessionId,
      callSid: voiceResult.sessionId,
    });

    return NextResponse.json({
      success: true,
      call: callRecord,
      voiceEngine: voiceResult.engine,
      channel: voiceResult.channel,
      status: voiceResult.status,
      callSid: voiceResult.sessionId,
      details: voiceResult.details,
    });
  } catch (error: any) {
    console.error("Call initiation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to initiate call" },
      { status: 500 }
    );
  }
}
