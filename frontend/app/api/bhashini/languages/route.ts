import { NextResponse } from 'next/server';
import { BHASHINI_LANGUAGES, MULTILINGUAL_RECOVERY_SUGGESTIONS } from '@/lib/bhashini';

export async function GET() {
  return NextResponse.json({
    languages: BHASHINI_LANGUAGES,
    suggestions: MULTILINGUAL_RECOVERY_SUGGESTIONS,
    totalCount: BHASHINI_LANGUAGES.length,
    status: 'active',
  });
}
