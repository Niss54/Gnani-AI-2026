import { NextResponse } from "next/server";
import { SOVEREIGN_GRAPH_TOPOLOGY } from "@/lib/hybrid-graph-rag";

export function GET() {
  return NextResponse.json({...SOVEREIGN_GRAPH_TOPOLOGY, source: "synthetic_demo"});
}
