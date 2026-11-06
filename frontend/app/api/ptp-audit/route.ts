import { NextRequest, NextResponse } from 'next/server';
import { generatePtpAuditNote } from '@/lib/ptp-audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const note = generatePtpAuditNote(body);
    return NextResponse.json({ success: true, auditNote: note });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Audit note generation failed' }, { status: 500 });
  }
}
