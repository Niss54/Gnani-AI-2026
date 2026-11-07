import { NextRequest, NextResponse } from 'next/server';
import { getFallbackCorporateVeilResult } from '@/lib/hybrid-graph-rag';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query || 'TechFlow Solutions';
    const company = body.company || query;

    // Call Python FastAPI backend if online
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${backendUrl}/api/graph-rag/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, company }),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Backend offline, fallback to deterministic in-memory result
    }

    const fallbackResult = getFallbackCorporateVeilResult(company || query);
    return NextResponse.json(fallbackResult);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
