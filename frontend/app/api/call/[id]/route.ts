import { NextRequest, NextResponse } from "next/server";
import { getCall } from "@/lib/call-store";
import { getInvoiceById } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const call = getCall(id);

    if (!call) {
      return NextResponse.json(
        { success: false, error: "Call record not found" },
        { status: 404 }
      );
    }

    const invoice = getInvoiceById(call.invoiceId);

    return NextResponse.json({
      success: true,
      call,
      invoice,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
