import { NextResponse } from 'next/server';
import { SOVEREIGN_GRAPH_TOPOLOGY } from '@/lib/hybrid-graph-rag';

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://gnani-ai-2026.onrender.com';
    try {
      const res = await fetch(`${backendUrl}/api/graph-rag/topology`);
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Backend offline
    }

    return NextResponse.json(SOVEREIGN_GRAPH_TOPOLOGY);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve graph topology' },
      { status: 500 }
    );
  }
}
