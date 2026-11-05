export type RiskTier = "LOW" | "MEDIUM" | "CRITICAL";

export type InvoiceStatus = 
  | "OVERDUE"
  | "CALLING"
  | "IN_NEGOTIATION"
  | "PTP_AGREED"
  | "PTP_COMMITTED"
  | "RECOVERED"
  | "DISPUTED"
  | "LEGAL_ESCALATED";

export interface Debtor {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  riskTier: RiskTier;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  debtorId?: string;
  debtor?: Debtor;
  debtorName?: string;
  debtorCompany?: string;
  debtorPhone?: string;
  debtorEmail?: string;
  amountDue: number;
  amount?: number;
  currency: string;
  dueDate: string;
  daysPastDue?: number;
  daysOverdue?: number;
  deliverableSummary?: string;
  description?: string;
  status: InvoiceStatus;
  paymentLinkUrl?: string;
  ptpAmount?: number;
  ptpDate?: string;
  promiseToPayAmount?: number;
  promiseToPayDate?: string;
  freelancerName?: string;
  freelancerEmail?: string;
  recoveredAmount?: number;
  revclaimFeeDeducted?: number;
  netPayoutToUser?: number;
  payoutStatus?: "PENDING" | "REMITTED";
  graphRiskScore?: number;
  syndicateRiskScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CallRecord {
  id: string;
  invoiceId: string;
  debtorName: string;
  debtorPhone: string;
  status: "idle" | "calling" | "completed" | "failed";
  mode: "live" | "demo";
  conversationId?: string;
  callSid?: string;
  createdAt: string;
  updatedAt: string;
  result?: CallResult;
}

export interface TranscriptUtterance {
  role: "agent" | "debtor";
  message: string;
  timestamp: string;
}

export interface CallResult {
  summary: string;
  ptpAmount?: number;
  ptpDate?: string;
  disputeReason?: string;
  confidence: "high" | "medium" | "low";
  transcript: TranscriptUtterance[];
}

export interface SettlementRecord {
  id: string;
  invoiceId: string;
  paymentId: string;
  razorpayPaymentId?: string;
  amountRecovered: number;
  feeDeducted: number;
  paymentMethod: string;
  settledAt: string;
}

export interface CockpitStats {
  totalOverdueAmount: number;
  recoveredAmount: number;
  totalRecoveredAmount?: number;
  recoveryRatePercent: number;
  recoveryRatePercentage?: number;
  activeChasingCount: number;
  inNegotiationCount?: number;
  overdueCount?: number;
  recoveredCount?: number;
  settledInvoicesCount?: number;
}
