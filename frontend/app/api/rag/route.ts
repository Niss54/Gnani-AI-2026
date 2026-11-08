import { NextRequest, NextResponse } from 'next/server';
import { searchStatutoryRag } from '@/lib/rag';

export async function POST(req: NextRequest) {
  try {
    const { query, topK = 2 } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const results = searchStatutoryRag(query, topK);
    const groundingText = results
      .map((r) => `[${r.docTitle} - ${r.sectionTitle}]:\n${r.content}`)
      .join('\n\n');

    return NextResponse.json({
      query,
      results,
      groundingText,
      totalChunksSearched: 5,
      status: 'success',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'RAG query failed' }, { status: 500 });
  }
}
