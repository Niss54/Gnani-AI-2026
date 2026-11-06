import { NextRequest, NextResponse } from "next/server";
import { getInvoices, getCockpitStats, addInvoice } from "@/lib/db";
import { Invoice } from "@/lib/types";

export async function GET() {
  try {
    const invoices = getInvoices();
    const stats = getCockpitStats();

    return NextResponse.json({
      success: true,
      invoices,
      stats,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load invoices",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newInvoice: Invoice = {
      id: `INV-${Date.now().toString().slice(-4)}`,
      invoiceNumber: body.invoiceNumber || `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
      debtorName: body.debtorName || "Alex Rivera",
      debtorCompany: body.debtorCompany || "Client Corp",
      debtorPhone: body.debtorPhone || "+14155552671",
      debtorEmail: body.debtorEmail || "finance@clientcorp.com",
      amount: Number(body.amount) || 1200,
      amountDue: Number(body.amount) || 1200,
      currency: "USD",
      dueDate: body.dueDate || new Date(Date.now() - 35 * 86400000).toISOString().split("T")[0],
      daysOverdue: Number(body.daysOverdue) || 35,
      status: "OVERDUE",
      description: body.description || "Contract Design Services",
      freelancerName: "Nishant Maurya",
      freelancerEmail: "nishantma05@gmail.com",
    };

    addInvoice(newInvoice);
    return NextResponse.json({ success: true, invoice: newInvoice }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add invoice",
      },
      { status: 500 }
    );
  }
}
