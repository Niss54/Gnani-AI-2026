/**
 * RevClaim AI × Resend Cloud Email Service
 * Autonomous Multi-Rail Invoice Settlement & MSME Notice Engine
 */

export interface ResendEmailParams {
  to: string;
  clientName: string;
  amount: number;
  invoiceNumber: string;
  paymentLink: string;
  subject?: string;
  bodyText?: string;
  daysOverdue?: number;
  deliverable?: string;
  debtorCompany?: string;
  forceSend?: boolean; // When user explicitly requests email in chat or clicks email button
}

export interface ResendResponse {
  success: boolean;
  messageId?: string;
  recipient: string;
  provider: "resend";
  error?: string;
  sandboxRedirected?: boolean;
}

function textBody(params: ResendEmailParams): string {
  return `Invoice ${params.invoiceNumber}\nRecorded amount: INR ${params.amount.toLocaleString("en-IN")}\n${params.deliverable ? `Deliverable: ${params.deliverable}\n` : ""}Payment link: ${params.paymentLink}\n\nPlease verify the invoice with your usual business contact if you have a question.`;
}

/** Send only to the explicit recipient; provider acceptance is not delivery. */
export async function sendRecoveryEmail(params: ResendEmailParams): Promise<ResendResponse> {
  const recipient = params.to?.trim() || "";
  const failure = (error: string): ResendResponse => ({ success: false, recipient, provider: "resend", error });
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) return failure("Email provider is not configured.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || !Number.isFinite(params.amount) || params.amount <= 0) return failure("Invalid recipient or amount.");
  try {
    const link = new URL(params.paymentLink);
    if (link.protocol !== "https:" || link.username || link.password) return failure("A verified HTTPS payment link is required.");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [recipient], subject: params.subject || `Invoice ${params.invoiceNumber}`, text: textBody(params) }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await response.json();
    if (!response.ok || typeof data.id !== "string" || !data.id) return failure("Provider did not confirm acceptance.");
    return { success: true, messageId: data.id, recipient, provider: "resend" };
  } catch { return failure("Email outcome is unknown; reconcile before retrying."); }
}
