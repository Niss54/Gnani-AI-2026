import { NextResponse } from "next/server";
import { getFallbackCorporateVeilResult } from "@/lib/hybrid-graph-rag";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const company = body?.company || body?.query;
  if (typeof company !== "string" || !["TechFlow Solutions", "Sharma Logistics"].includes(company)) {
    return NextResponse.json({error: "Choose a listed sample company."}, {status: 422});
  }
  return NextResponse.json({...getFallbackCorporateVeilResult(company), source: "synthetic_demo"});
}
