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
    const { invoiceId, mode = "live", channel = "auto", phone: customPhone, language = "Hindi", deliverable = "Custom E-Commerce Luxury Jewellery Website Development" } = body;

    let invoice = invoiceId ? db.getInvoice(invoiceId) : null;
    if (!invoice) {
      // Fallback create temporary test invoice for custom testing
      invoice = {
        id: invoiceId || "inv-custom-live",
        invoiceNumber: body.invoiceNumber || "INV-2026-JEWEL-1042",
        amountDue: body.amount || 10000,
        amount: body.amount || 10000,
        dueDate: new Date().toISOString(),
        currency: "INR",
        debtorName: body.clientName || "Nishant Maurya",
        debtorPhone: customPhone || "+918840301998",
        status: "OVERDUE",
        deliverableSummary: deliverable,
        description: deliverable,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Clone so we don't mutate unexpectedly
      invoice = { ...invoice };
      if (body.deliverable) invoice.deliverableSummary = body.deliverable;
      if (body.amount) {
        invoice.amountDue = body.amount;
        invoice.amount = body.amount;
      }
    }

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (customPhone) {
      invoice.debtorPhone = customPhone;
      if (invoice.debtor) invoice.debtor.phone = customPhone;
    }

    db.updateInvoiceStatus(invoice.id, "CALLING");

    // Do NOT send email here upon call initiation.
    // Email must ONLY be sent when the user explicitly agrees and requests it via voice.

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
      localeHint: language as any,
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
