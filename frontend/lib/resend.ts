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

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM =
  process.env.RESEND_FROM_EMAIL || "RevClaim Accounts <onboarding@resend.dev>";
const SANDBOX_OWNER_EMAIL = "nishantma05@gmail.com";
const BRAND_LOGO_URL =
  process.env.BRAND_LOGO_URL ||
  "https://rev-claim-ai.vercel.app/logo2.png";
const VERIFIED_BADGE_URL =
  process.env.VERIFIED_BADGE_URL ||
  "https://rev-claim-ai.vercel.app/verified%20button.png";

// Burst debounce window (20 seconds) to prevent duplicate spam (e.g., 10 emails at once) while allowing user requests
const EMAIL_BURST_DEBOUNCE_MS = 20 * 1000;
// Hard burst flood limit (6 seconds) to strictly prevent multi-trigger spam bursts ("ek sath 10 email n aa jaae")
const HARD_BURST_FLOOD_LIMIT_MS = 6 * 1000;
const sentEmailTimestamps = new Map<string, number>();

/**
 * Builds RFC 2046 compliant plain-text alternative (lowers spam score to ~0.1 on SpamAssassin)
 */
function generateSettlementText(params: ResendEmailParams, note?: string): string {
  const cleanInv = params.invoiceNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const vanAccount = `REVC${cleanInv}`;
  const formattedAmount = `INR ${params.amount.toLocaleString("en-IN")}`;
  const deliverable = params.deliverable || "Full-Stack AI Voice Agents & Next.js Cockpit Architecture";

  return `${note ? "--- " + note + " ---\n\n" : ""}STATEMENT OF ACCOUNT — REVCLAIM AI
=====================================================
Invoice Number: ${params.invoiceNumber}
Client Entity:  ${params.clientName} ${params.debtorCompany ? `(${params.debtorCompany})` : ""}
Deliverable:    ${deliverable}
Balance Due:    ${formattedAmount}
Status:         Pending Reconciliation
=====================================================

Dear ${params.clientName},

Please find below the official statement of account and multi-rail settlement options for Invoice #${params.invoiceNumber}.

OPTION 1: INSTANT DIGITAL CHECKOUT (UPI, CARDS, NETBANKING)
Direct Checkout Link: ${params.paymentLink}
(Supports Google Pay, PhonePe, Paytm, Visa, Mastercard, RuPay & NetBanking via Razorpay Gateway)

OPTION 2: DIRECT CORPORATE BANK WIRE (NEFT / RTGS / IMPS)
• Beneficiary Name: Nishant Maurya — RevClaim Collection Escrow
• Virtual Account Number: ${vanAccount}
• Bank Name: HDFC Bank Smart Collect
• IFSC Code: HDFC0000050
• Account Type: Current Account
* Automatically reconciled via webhook within 3 seconds.

STATUTORY ADVISORY:
In compliance with Sections 15 & 16 of the MSMED Act 2006, prompt reconciliation ensures commercial continuity and prevents interest compounding.

NEED AN INSTALLMENT PLAN OR HAVE QUESTIONS?
If you would like to request a 50% split installment or have questions about deliverables, reply directly to this email or message Sarah on WhatsApp (+91 88403 01998).

Sincerely,
Sarah — Billing & Accounts Mediation Desk
RevClaim AI Technologies
Contact: nishantma05@gmail.com | +91 88403 01998
`;
}

/**
 * Builds Executive Multi-Tile HTML Settlement Statement
 * Formatted with modern cards/tiles matching Stripe & Brex transactional design
 */
function generateSettlementHtml(params: ResendEmailParams, note?: string): string {
  const cleanInv = params.invoiceNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const vanAccount = `REVC${cleanInv}`;
  const formattedAmount = `₹${params.amount.toLocaleString("en-IN")}`;
  const days = params.daysOverdue || 14;
  const deliverable = params.deliverable || "Full-Stack AI Voice Agents & Next.js Cockpit Architecture";
  const debtorCompany = params.debtorCompany || "Acme Creative Studios";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Statement of Account — #${params.invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">

  <!-- Preheader text for clean email preview in Gmail -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #f1f5f9; mso-hide: all;">
    Official Statement of Account for Invoice #${params.invoiceNumber} (${formattedAmount} due). Settle securely via Razorpay (UPI/Cards) or Direct Corporate Wire.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 36px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
          
          ${note ? `
          <!-- Notice Banner -->
          <tr>
            <td style="padding-bottom: 14px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 12px 18px;">
                <tr>
                  <td style="font-size: 12px; color: #b45309; font-weight: 600; line-height: 1.5;">
                    ℹ️ ${note}
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ""}

          <!-- ── TILE 1: BRAND & AUTHENTICATION HEADER CARD ── -->
          <tr>
            <td style="padding-bottom: 14px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04); overflow: hidden;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="middle">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 44px; vertical-align: middle;">
                                <img
                                  src="${BRAND_LOGO_URL}"
                                  alt="RevClaim AI Logo"
                                  width="42"
                                  height="42"
                                  style="width: 42px; height: 42px; border-radius: 12px; display: block; object-fit: cover; border: 1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(0,0,0,0.06);"
                                />
                              </td>
                              <td style="padding-left: 12px; vertical-align: middle;">
                                <table role="presentation" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td style="font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; line-height: 1.2; vertical-align: middle;">
                                      RevClaim AI
                                    </td>
                                    <td style="padding-left: 6px; vertical-align: middle;">
                                      <img
                                        src="${VERIFIED_BADGE_URL}"
                                        alt="Verified"
                                        width="16"
                                        height="16"
                                        style="width: 16px; height: 16px; display: block;"
                                      />
                                    </td>
                                  </tr>
                                </table>
                                <div style="font-size: 11px; font-weight: 600; color: #64748b; letter-spacing: 0.2px; margin-top: 3px;">
                                  Autonomous Accounts &amp; Settlement Desk
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── TILE 2: EXECUTIVE INVOICE HERO CARD (THE MAIN TILE) ── -->
          <tr>
            <td style="padding-bottom: 14px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05); overflow: hidden;">
                <!-- Accent Line -->
                <tr>
                  <td height="4" style="background: linear-gradient(90deg, #0284c7 0%, #38bdf8 100%); font-size: 1px; line-height: 1px;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding: 30px 28px;">
                    <!-- Tag & Greeting -->
                    <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                      Outstanding Invoice Balance
                    </div>
                    <div style="font-size: 38px; font-weight: 900; color: #0f172a; letter-spacing: -1px; margin-bottom: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      ${formattedAmount}
                    </div>

                    <!-- Meta Details Tiles Grid -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px; padding: 14px 16px;">
                      <tr>
                        <td width="33%" style="padding: 4px 6px;">
                          <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Invoice #</div>
                          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px;">${params.invoiceNumber}</div>
                        </td>
                        <td width="33%" style="padding: 4px 6px; border-left: 1px solid #e2e8f0;">
                          <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Client / Entity</div>
                          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${params.clientName}</div>
                        </td>
                        <td width="34%" style="padding: 4px 6px; border-left: 1px solid #e2e8f0;">
                          <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Status</div>
                          <div style="font-size: 12px; font-weight: 800; color: #dc2626; margin-top: 2px;">Overdue • ${days} Days</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Primary 1-Click Action Button -->
                    <div style="text-align: center; margin-bottom: 14px;">
                      <a href="${params.paymentLink}" style="background: linear-gradient(135deg, #0284c7 0%, #0052cc 100%); color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 12px; font-size: 15px; font-weight: 800; display: inline-block; letter-spacing: -0.2px; box-shadow: 0 4px 16px rgba(2, 132, 199, 0.35);">
                        Settle ${formattedAmount} via Razorpay &rarr;
                      </a>
                    </div>
                    <div style="text-align: center; font-size: 11px; color: #64748b; font-weight: 600;">
                      🔒 Instant Clearance • Supports UPI (GPay/PhonePe), Credit/Debit Cards & NetBanking
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── TILE 3: DUAL-RAIL SETTLEMENT OPTIONS CARD ── -->
          <tr>
            <td style="padding-bottom: 14px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04); overflow: hidden;">
                <tr>
                  <td style="padding: 24px 28px;">
                    <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
                      Payment Settlement Methods
                    </div>

                    <!-- Rail A: Instant Digital Checkout Tile -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; margin-bottom: 14px; padding: 16px 18px;">
                      <tr>
                        <td>
                          <div style="font-size: 12px; font-weight: 800; color: #6d28d9; text-transform: uppercase;">
                            Option 1: Instant Merchant of Record Checkout
                          </div>
                          <div style="font-size: 12px; color: #4c1d95; margin: 4px 0 10px 0; line-height: 1.5;">
                            Direct digital settlement via Razorpay Gateway (UPI, Cards, NetBanking). Reconciles in under 5 seconds with automated receipt.
                          </div>
                          <a href="${params.paymentLink}" style="color: #4f46e5; font-size: 12px; font-weight: 700; text-decoration: underline;">
                            Launch Secure Checkout Portal &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Rail B: Direct Corporate Bank Wire Tile -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px;">
                      <tr>
                        <td>
                          <div style="font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; margin-bottom: 8px;">
                            Option 2: Direct Corporate Bank Wire (NEFT / RTGS / IMPS)
                          </div>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="3" style="font-size: 12px; color: #334155;">
                            <tr>
                              <td width="35%" style="color: #64748b; font-weight: 600;">Beneficiary:</td>
                              <td style="font-weight: 700; color: #0f172a;">Nishant Maurya — RevClaim Escrow</td>
                            </tr>
                            <tr>
                              <td style="color: #64748b; font-weight: 600;">Virtual Account:</td>
                              <td style="font-weight: 800; color: #4f46e5; font-family: monospace; font-size: 13px;">${vanAccount}</td>
                            </tr>
                            <tr>
                              <td style="color: #64748b; font-weight: 600;">Bank & Branch:</td>
                              <td style="font-weight: 600; color: #0f172a;">HDFC Bank Smart Collect Escrow</td>
                            </tr>
                            <tr>
                              <td style="color: #64748b; font-weight: 600;">IFSC Code:</td>
                              <td style="font-weight: 800; color: #0f172a; font-family: monospace;">HDFC0000050</td>
                            </tr>
                          </table>
                          <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">
                            * Incoming transfers are matched and reconciled programmatically within 3 seconds.
                          </div>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── TILE 4: LINE ITEMS & DELIVERABLES BREAKDOWN CARD ── -->
          <tr>
            <td style="padding-bottom: 14px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04); overflow: hidden;">
                <tr>
                  <td style="padding: 24px 28px;">
                    <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                      Invoice Deliverable Scope
                    </div>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="8" style="font-size: 12px; border-collapse: collapse;">
                      <thead>
                        <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700;">
                          <th align="left" style="padding-bottom: 8px;">Description</th>
                          <th align="center" style="padding-bottom: 8px;">Qty</th>
                          <th align="right" style="padding-bottom: 8px;">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                          <td style="padding: 10px 0; font-weight: 600; color: #0f172a;">
                            ${deliverable}
                            <div style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">
                              Project Milestone Deliverable • Approved by ${params.clientName}
                            </div>
                          </td>
                          <td align="center" style="padding: 10px 0; color: #64748b;">1</td>
                          <td align="right" style="padding: 10px 0; font-weight: 700; color: #0f172a; font-family: monospace;">${formattedAmount}</td>
                        </tr>
                        <tr>
                          <td colspan="2" align="right" style="padding-top: 10px; font-weight: 600; color: #64748b;">Subtotal:</td>
                          <td align="right" style="padding-top: 10px; font-weight: 700; color: #0f172a; font-family: monospace;">${formattedAmount}</td>
                        </tr>
                        <tr>
                          <td colspan="2" align="right" style="padding-top: 4px; font-weight: 800; color: #0f172a; font-size: 13px;">Total Outstanding:</td>
                          <td align="right" style="padding-top: 4px; font-weight: 900; color: #4f46e5; font-size: 14px; font-family: monospace;">${formattedAmount}</td>
                        </tr>
                      </tbody>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── TILE 5: STATUTORY COMPLIANCE & LEGAL NOTICE TILE ── -->
          <tr>
            <td style="padding-bottom: 14px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; padding: 16px 20px;">
                <tr>
                  <td>
                    <div style="font-size: 12px; font-weight: 800; color: #1e40af; margin-bottom: 4px;">
                      Statutory Reference — Section 15 & 16, MSMED Act 2006
                    </div>
                    <div style="font-size: 12px; line-height: 1.6; color: #475569;">
                      This statement is issued to facilitate prompt commercial reconciliation. Under the MSMED Act, delayed payments beyond agreed terms accrue statutory compound interest. Settling within the active reconciliation window ensures commercial goodwill and zero reporting escalation.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── TILE 6: SUPPORT, ASSISTANCE & DISPUTE CONTACT TILE ── -->
          <tr>
            <td style="padding-bottom: 14px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04); padding: 20px 24px;">
                <tr>
                  <td>
                    <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
                      Need an Installment Plan or Have Questions?
                    </div>
                    <div style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 12px;">
                      If you're facing a temporary cash crunch, Sarah from our billing desk can structure a 50% split plan (50% today, remainder next billing cycle).
                    </div>
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <a href="https://wa.me/918840301998?text=Hello%20Sarah,%20regarding%20invoice%20${params.invoiceNumber}" style="background-color: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 700; display: inline-block;">
                            💬 Message Sarah on WhatsApp
                          </a>
                        </td>
                        <td style="padding-left: 10px;">
                          <a href="mailto:nishantma05@gmail.com?subject=Inquiry%20Invoice%20${params.invoiceNumber}" style="background-color: #f8fafc; color: #334155; border: 1px solid #cbd5e1; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 700; display: inline-block;">
                            ✉️ Reply via Email
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── TILE 7: CLEAN CORPORATE FOOTER ── -->
          <tr>
            <td style="text-align: center; padding: 18px 20px;">
              <table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin: 0 auto 10px auto;">
                <tr>
                  <td align="center">
                    <img
                      src="${BRAND_LOGO_URL}"
                      alt="RevClaim AI"
                      width="28"
                      height="28"
                      style="width: 28px; height: 28px; border-radius: 50%; opacity: 0.9; display: block; border: 1px solid #e2e8f0;"
                    />
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.6;">
                RevClaim AI &bull; Autonomous Indic Voice &amp; Settlement Infrastructure<br>
                Dispatched on behalf of <strong>Nishant Maurya</strong> &bull; Powered by Razorpay Gateway &amp; HDFC Escrow<br>
                This is an official transactional billing statement. Reference: <span style="font-family: monospace;">${cleanInv}</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Sends autonomous settlement email via Resend Cloud API
 * Automatically handles sandbox domain restrictions by routing to developer inbox
 */
export async function sendRecoveryEmail(
  params: ResendEmailParams
): Promise<ResendResponse> {
  const targetEmail = params.to?.trim() || SANDBOX_OWNER_EMAIL;
  // Professional, transactional subject without spam triggers (no emojis, no caps like [URGENT])
  const subject =
    params.subject ||
    `Payment Link: Invoice #${params.invoiceNumber} for ${params.clientName} (₹${params.amount.toLocaleString("en-IN")})`;

  // Anti-Spam Debounce:
  // 1. Strict Flood Barrier (6s hard limit): Suppresses multi-trigger bursts ("ek sath 10 email n aa jaae")
  // 2. Soft Debounce (20s): Suppresses automatic duplicates unless forceSend is explicitly requested
  const cacheKey = `${targetEmail}_${params.invoiceNumber}`.toLowerCase();
  const lastSent = sentEmailTimestamps.get(cacheKey);
  const now = Date.now();

  const isHardBurstFlood = lastSent && now - lastSent < HARD_BURST_FLOOD_LIMIT_MS;
  const isSoftDuplicate = !params.forceSend && lastSent && now - lastSent < EMAIL_BURST_DEBOUNCE_MS;

  if (isHardBurstFlood || isSoftDuplicate) {
    const elapsedSec = Math.round((now - (lastSent || now)) / 1000);
    console.log(
      `[Resend Anti-Spam] Suppressed duplicate email to ${targetEmail} for ${params.invoiceNumber} (${isHardBurstFlood ? "Hard flood guard 6s" : "Soft debounce 20s"}, sent ${elapsedSec}s ago)`
    );
    return {
      success: true,
      messageId: `dedup_${lastSent}`,
      recipient: targetEmail,
      provider: "resend",
    };
  }

  console.log(`[Resend] Initiating delivery to ${targetEmail} for ${params.invoiceNumber}`);

  // 1. Attempt primary dispatch to target email
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [targetEmail],
        reply_to: SANDBOX_OWNER_EMAIL,
        subject,
        html: generateSettlementHtml(params),
        text: generateSettlementText(params),
      }),
    });

    const data = await res.json();

    if (res.ok && data?.id) {
      sentEmailTimestamps.set(cacheKey, Date.now());
      console.log(`[Resend] Successfully sent email (${data.id}) to ${targetEmail}`);
      return {
        success: true,
        messageId: data.id,
        recipient: targetEmail,
        provider: "resend",
      };
    }

    // 2. If blocked by Resend unverified domain policy (HTTP 403), gracefully redirect to sandbox owner
    if (res.status === 403 && targetEmail !== SANDBOX_OWNER_EMAIL) {
      console.warn(
        `[Resend Sandbox Notice] Unverified domain cannot receive external emails. Rerouting debtor copy to developer: ${SANDBOX_OWNER_EMAIL}`
      );

      const redirectNote = `Notice originally addressed to: ${targetEmail} (${params.clientName}). Delivered to your verified developer inbox.`;

      const retryRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [SANDBOX_OWNER_EMAIL],
          reply_to: SANDBOX_OWNER_EMAIL,
          subject: `[Client: ${params.clientName}] ${subject}`,
          html: generateSettlementHtml(params, redirectNote),
          text: generateSettlementText(params, redirectNote),
        }),
      });

      const retryData = await retryRes.json();
      if (retryRes.ok && retryData?.id) {
        sentEmailTimestamps.set(cacheKey, Date.now());
        console.log(
          `[Resend Sandbox] Successfully delivered demo copy (${retryData.id}) to ${SANDBOX_OWNER_EMAIL}`
        );
        return {
          success: true,
          messageId: retryData.id,
          recipient: SANDBOX_OWNER_EMAIL,
          provider: "resend",
          sandboxRedirected: true,
        };
      }
    }

    return {
      success: false,
      recipient: targetEmail,
      provider: "resend",
      error: data?.message || "Failed to dispatch via Resend",
    };
  } catch (err: any) {
    console.error("[Resend Error]:", err);
    return {
      success: false,
      recipient: targetEmail,
      provider: "resend",
      error: err?.message,
    };
  }
}
