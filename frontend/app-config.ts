export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  supportsChatInput: boolean;

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;

  // agent dispatch configuration
  agentName?: string;

  // LiveKit Cloud Sandbox configuration
  sandboxId?: string;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'RevClaim AI',
  pageTitle: 'RevClaim AI — Autonomous Voice Revenue Recovery',
  pageDescription: 'Autonomous Indic Voice Agent for Unpaid B2B Invoices & Debt Recovery, powered by Gnani.ai Vachana (Prisma v3.0 STT + Timbre v3.0 TTS), LiveKit Cloud, Razorpay Gateway & Sovereign Graph RAG',

  supportsChatInput: true,

  logo: '/logo2.png',
  accent: '#4F46E5',
  logoDark: '/logo2.png',
  accentDark: '#6366F1',
  startButtonText: 'Start Voice Call',

  // agent dispatch configuration
  agentName: process.env.AGENT_NAME ?? undefined,

  // LiveKit Cloud Sandbox configuration
  sandboxId: undefined,
};
