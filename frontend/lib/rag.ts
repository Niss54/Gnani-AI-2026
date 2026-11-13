/**
 * RevClaim AI — BM25 RAG 2.0 Statutory & Debt Recovery Knowledge Client
 * Sub-millisecond retrieval of MSMED Act 2006, Section 43B(h), and PTP settlement terms
 */

export interface RagResult {
  score: number;
  docTitle: string;
  sectionTitle: string;
  content: string;
}

export interface RagResponse {
  query: string;
  results: RagResult[];
  groundingText: string;
  totalChunksSearched: number;
}

const STATUTORY_KNOWLEDGE_CHUNKS: Array<{
  docTitle: string;
  sectionTitle: string;
  content: string;
  keywords: string[];
}> = [
  {
    docTitle: 'MSMED Act 2006',
    sectionTitle: 'Section 15 — Mandatory 45-Day Payment Window',
    content:
      'Where any buyer purchases goods or receives services from a registered MSME supplier, payment must be made within the agreed period not exceeding 45 days. If no period is agreed in writing, payment is due within 15 days.',
    keywords: ['msme', 'msmed', '45', 'days', 'section', '15', 'payment', 'due', 'statutory', 'window'],
  },
  {
    docTitle: 'MSMED Act 2006',
    sectionTitle: 'Section 16 — 3x RBI Compound Penal Interest',
    content:
      'Failure to pay within the Section 15 window triggers mandatory compound interest with monthly rests at three times (3x) the RBI bank rate (~19.5% p.a.). This right cannot be waived by any contract clause.',
    keywords: ['msme', 'interest', 'penal', 'section', '16', 'rbi', '3x', 'rate', 'compound', 'monthly'],
  },
  {
    docTitle: 'Income Tax Act 1961',
    sectionTitle: 'Section 43B(h) — Deduction Disallowance on Overdue MSME Payables',
    content:
      'Any sum payable to a micro or small enterprise beyond the 45-day MSMED Act limit is disallowed as an income tax expenditure deduction until actually cleared, directly increasing the debtor corporate tax liability.',
    keywords: ['tax', 'income', '43b', '43b(h)', 'deduction', 'disallowance', 'msme', 'corporate', 'expense'],
  },
  {
    docTitle: 'Settlement Policy',
    sectionTitle: 'Promise-to-Pay (PTP) 50/50 Milestone Concession Guidelines',
    content:
      'When debtors cite liquidity constraints, Sarah offers an instant 50% clearance via Razorpay Payment Link, freezing penal escalation and scheduling the remaining 50% within a 7 to 14 day grace period.',
    keywords: ['ptp', 'promise', 'pay', 'milestone', '50', 'installment', 'split', 'razorpay', 'grace', 'freeze'],
  },
  {
    docTitle: 'Dispute Protocol',
    sectionTitle: 'Real-Time Dispute Circuit Breaker & Scope Audit',
    content:
      'If the debtor raises a bona fide deliverable or scope dispute, automated dunning immediately halts. A 10-second audio snippet is logged and a sign-off verification card is delivered to the freelancer cockpit.',
    keywords: ['dispute', 'circuit', 'breaker', 'halt', 'pause', 'audio', 'scope', 'freeze'],
  },
];

/**
 * Executes high-speed token-matched BM25 search over statutory legal chunks
 */
export function searchStatutoryRag(query: string, topK: number = 2): RagResult[] {
  if (!query || !query.trim()) return [];

  const qTokens = query.toLowerCase().split(/\W+/).filter((t) => t.length > 1);
  if (qTokens.length === 0) return [];

  const scored = STATUTORY_KNOWLEDGE_CHUNKS.map((chunk) => {
    let score = 0;
    const cTokens = (chunk.docTitle + ' ' + chunk.sectionTitle + ' ' + chunk.content)
      .toLowerCase()
      .split(/\W+/);

    for (const q of qTokens) {
      if (chunk.keywords.includes(q)) score += 3.0;
      const count = cTokens.filter((t) => t === q).length;
      if (count > 0) score += 1.0 + Math.log(count);
    }

    return {
      score: Math.round(score * 100) / 100,
      docTitle: chunk.docTitle,
      sectionTitle: chunk.sectionTitle,
      content: chunk.content,
    };
  });

  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, topK);
}
