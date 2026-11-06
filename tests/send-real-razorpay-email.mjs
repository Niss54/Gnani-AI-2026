/**
 * RevClaim AI — Live Razorpay Payment Link Generation & Resend Dispatch Test
 *
 * 1. Generates real live Razorpay Payment Link via Razorpay API (v1/payment_links)
 *    using the user-provided test key: your_razorpay_key_id
 * 2. Formats high-fidelity executive settlement statement HTML:
 *    - Replaces ⚡ emoji with official RevClaim AI website logo (logo2.png / logo-email.png)
 *    - Replaces plain MSME text with official Verified badge (verified button.png / verified-email.png)
 *    - Samsung-inspired 2-color mixer design: Ocean blue at top, transitioning seamlessly into pure white,
 *      with glowing ocean blue side accent borders.
 * 3. Dispatches the email to nishantma05@gmail.com via Resend Cloud API with inline CID attachments.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 1. Auto-discover and safely load .env
function loadEnv() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "frontend", ".env"),
    path.join(currentDir, ".env"),
    path.join(currentDir, "..", ".env"),
  ];

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const text = fs.readFileSync(envPath, "utf-8");
        for (const line of text.split("\n")) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
            const eqIdx = trimmed.indexOf("=");
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
            process.env[key] = val;
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }
}
loadEnv();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "your_razorpay_key_id";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const TARGET_EMAIL = "nishantma05@gmail.com";
const TARGET_PHONE = "+918840301998";
const CLIENT_NAME = "Nishant Maurya";
const INVOICE_NUMBER = "INV-2026-NISHANT-LIVE";
const AMOUNT_INR = 5000;

console.log("================================================================================");
console.log("⚡ RevClaim AI — Live Razorpay Link Creation & Resend Email Dispatch");
console.log("================================================================================\n");

async function main() {
  console.log(`[1/3] Contacting Razorpay API (Key: ${RAZORPAY_KEY_ID})...`);
  const authHeader = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

  const amountInPaise = AMOUNT_INR * 100; // 5000 * 100 = 500000 paise
  const halfAmountInPaise = Math.round(amountInPaise / 2); // 50% split for PTP negotiation

  const linkPayload = {
    amount: amountInPaise,
    currency: "INR",
    accept_partial: true,
    first_min_partial_amount: halfAmountInPaise,
    description: `Settlement for Invoice #${INVOICE_NUMBER} via RevClaim AI (Sarah Mediation Desk)`,
    customer: {
      name: CLIENT_NAME,
      email: TARGET_EMAIL,
      contact: TARGET_PHONE,
    },
    notify: {
      sms: true,
      email: true,
    },
    reminder_enable: true,
    notes: {
      invoiceId: "inv_live_nishant",
      invoiceNumber: INVOICE_NUMBER,
      source: "revclaim_ai_voice_copilot",
      statutoryAct: "MSMED Act 2006 Section 16",
    },
  };

  const rzpRes = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(linkPayload),
  });

  if (!rzpRes.ok) {
    const errorBody = await rzpRes.text();
    throw new Error(`Razorpay API returned HTTP ${rzpRes.status}: ${errorBody}`);
  }

  const rzpData = await rzpRes.json();
  const paymentLinkUrl = rzpData.short_url || rzpData.url;
  const paymentLinkId = rzpData.id;

  console.log(`  ✔ Live Razorpay Payment Link Created Successfully!`);
  console.log(`  💳 Payment Link ID  : ${paymentLinkId}`);
  console.log(`  🔗 Live Checkout URL : ${paymentLinkUrl}`);
  console.log(`  💰 Amount Due        : ₹${AMOUNT_INR.toLocaleString("en-IN")}`);
  console.log(`  ⚖️ Partial Allowed   : 50% Upfront (₹${(AMOUNT_INR / 2).toLocaleString("en-IN")})\n`);

  console.log(`[2/3] Preparing Rich Executive HTML Settlement Email with Brand Logo & Verified Badge...`);

  // Load and encode logo and verified badge
  const logoPath = fs.existsSync("frontend/public/logo-email.png")
    ? "frontend/public/logo-email.png"
    : "frontend/public/logo2.png";
  const verifiedPath = fs.existsSync("frontend/public/verified-email.png")
    ? "frontend/public/verified-email.png"
    : "frontend/public/verified button.png";

  const logoBase64 = fs.readFileSync(logoPath).toString("base64");
  const verifiedBase64 = fs.readFileSync(verifiedPath).toString("base64");

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Statement of Account — ${INVOICE_NUMBER}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f0f7ff; margin: 0; padding: 24px 12px; color: #0f172a; -webkit-font-smoothing: antialiased;">
  
  <!-- Outer Card Frame with subtle ambient glow -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 auto; max-width: 620px;">
    <tr>
      <td align="center">
        
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 16px 45px -10px rgba(2, 132, 199, 0.22); border: 1.5px solid #bae6fd;">
          
          <!-- ── LIGHT OCEAN BLUE 2-COLOR MIXER COVER BANNER (85% WHITE/LIGHT, DARK OCEAN BLUE AT END) ── -->
          <tr>
            <td style="background: #ffffff; background: linear-gradient(180deg, #ffffff 0%, #fbfdff 35%, #f0f9ff 60%, #e0f2fe 82%, #38bdf8 92%, #0284c7 100%); padding: 32px 32px 28px 32px; text-align: left;">
              
              <!-- Brand Bar: Logo + Brand Name + Verified Blue Checkmark -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 22px;">
                <tr>
                  <td valign="middle" align="left">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <!-- Official Website Logo (Ultra-light 4KB) -->
                        <td style="width: 44px; vertical-align: middle; padding-right: 12px;">
                          <img
                            src="cid:revclaim-logo"
                            alt="RevClaim AI Logo"
                            width="44"
                            height="44"
                            style="width: 44px; height: 44px; border-radius: 12px; display: block; border: 1.5px solid #e2e8f0; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08); object-fit: cover; background: #ffffff;"
                          />
                        </td>
                        <!-- Brand Name + Verified Badge directly to the right -->
                        <td style="vertical-align: middle;">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a; line-height: 1.1; vertical-align: middle;">
                                RevClaim AI
                              </td>
                              <td style="padding-left: 6px; vertical-align: middle;">
                                <img
                                  src="cid:verified-badge"
                                  alt="Verified"
                                  width="18"
                                  height="18"
                                  style="width: 18px; height: 18px; display: block;"
                                />
                              </td>
                            </tr>
                          </table>
                          <div style="font-size: 11px; font-weight: 700; color: #0284c7; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 3px;">
                            Sovereign Indic Mediation Desk
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Hero Statement Title -->
              <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 6px 0; color: #0f172a; letter-spacing: -0.4px;">
                Statement of Account &amp; Settlement Rail
              </h1>
              <p style="font-size: 13px; margin: 0; color: #475569; font-weight: 500;">
                Accounts &amp; Billing Mediation Desk &bull; Reference: <strong style="color: #0284c7; background: #e0f2fe; padding: 2px 8px; border-radius: 6px; font-family: monospace;">${INVOICE_NUMBER}</strong>
              </p>

            </td>
          </tr>

          <!-- ── WHITE CENTER CONTENT BODY WITH OCEAN BLUE ACCENT SIDES ── -->
          <tr>
            <td style="background: #ffffff; border-left: 4px solid #0ea5e9; border-right: 4px solid #0ea5e9; padding: 28px 32px;">
              
              <p style="font-size: 15px; line-height: 1.6; margin-top: 0; color: #0f172a;">
                Dear <strong>${CLIENT_NAME}</strong>,
              </p>
              
              <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                This is an official payment reconciliation notice from <strong>RevClaim AI Accounts Desk</strong> regarding your pending invoice balance. For your convenience, an instant digital checkout link powered by <strong>Razorpay Payment Gateway</strong> has been generated below:
              </p>

              <!-- Invoice Summary Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f8fafc; border-radius: 16px; padding: 20px 22px; margin: 24px 0; border: 1.5px solid #e2e8f0; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.03);">
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px;">
                      <tr>
                        <td style="color: #64748b; padding-bottom: 10px; font-weight: 500;">Invoice Number:</td>
                        <td style="font-weight: 800; text-align: right; padding-bottom: 10px; color: #0f172a; font-family: monospace; font-size: 14px;">${INVOICE_NUMBER}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; padding-bottom: 10px; font-weight: 500;">Deliverable:</td>
                        <td style="font-weight: 600; text-align: right; padding-bottom: 10px; color: #0f172a;">Full-Stack AI Voice Agents &amp; Indic Pipeline</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; padding-bottom: 10px; font-weight: 500;">Aging / Status:</td>
                        <td style="font-weight: 800; text-align: right; padding-bottom: 10px; color: #dc2626;">Pending Settlement (Overdue)</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="border-top: 1.5px dashed #cbd5e1; padding-top: 14px;"></td>
                      </tr>
                      <tr>
                        <td style="font-size: 15px; font-weight: 800; color: #0f172a;">Total Payable:</td>
                        <td style="font-size: 24px; font-weight: 900; text-align: right; color: #0284c7; letter-spacing: -0.5px;">₹${AMOUNT_INR.toLocaleString("en-IN")}.00</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Button (Razorpay Direct Checkout) -->
              <div style="text-align: center; margin: 30px 0 16px 0;">
                <a href="${paymentLinkUrl}" target="_blank" style="display: inline-block; background: #0284c7; background: linear-gradient(135deg, #0284c7 0%, #0052cc 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 800; padding: 16px 42px; border-radius: 14px; box-shadow: 0 6px 22px rgba(2, 132, 199, 0.4); letter-spacing: -0.2px;">
                  Pay ₹${AMOUNT_INR.toLocaleString("en-IN")} via Razorpay &rarr;
                </a>
                <p style="font-size: 12px; color: #64748b; margin-top: 12px;">
                  🔒 Instant UPI (GPay / PhonePe / Paytm), RuPay, Credit/Debit Cards &amp; NetBanking
                </p>
              </div>

              <!-- PTP 50% Milestone Settlement Notice -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #0284c7; border-radius: 12px; padding: 14px 18px; margin: 22px 0;">
                <tr>
                  <td style="font-size: 13px; color: #0369a1; line-height: 1.5;">
                    <div style="font-weight: 800; margin-bottom: 3px;">
                      ⚖️ Flexible 50/50 PTP Milestone Policy:
                    </div>
                    You may also opt to clear an upfront <strong>50% milestone payment (₹${(AMOUNT_INR / 2).toLocaleString("en-IN")})</strong> directly on the Razorpay portal today to maintain active commercial vendor status and pause automated recovery proceedings.
                  </td>
                </tr>
              </table>

              <!-- Statutory Clause -->
              <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 11px; color: #64748b; line-height: 1.5;">
                <strong>Statutory Legal Notice:</strong> Under Section 15 &amp; 16 of the MSMED Act 2006, registered micro and small enterprises are protected with mandatory 45-day payment ceilings and statutory 3x RBI compound penal interest. Overdue payables also attract deduction disallowance under Section 43B(h) of the Income Tax Act 1961.
              </div>

            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background: #f8fafc; border-top: 1.5px solid #e0f2fe; padding: 22px 32px; font-size: 12px; color: #64748b; text-align: center;">
              <p style="margin: 0 0 6px 0;">Questions or reconciliation inquiries? Reply directly to this email or message Sarah on WhatsApp (+91 88403 01998).</p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">&copy; 2026 RevClaim AI Technologies &bull; Sovereign Indic Debt Mediation &amp; Payment Gateway</p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;

  console.log(`[3/3] Dispatching email to ${TARGET_EMAIL} via Resend Cloud API with inline CID attachments...`);
  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "RevClaim Accounts <onboarding@resend.dev>",
      to: [TARGET_EMAIL],
      subject: `Statement of Account: Invoice #${INVOICE_NUMBER} (INR ${AMOUNT_INR.toLocaleString("en-IN")}) — Razorpay Link`,
      html: emailHtml,
      attachments: [
        {
          filename: "logo.png",
          content: logoBase64,
          content_type: "image/png",
          content_id: "revclaim-logo",
          contentId: "revclaim-logo",
          disposition: "inline",
        },
        {
          filename: "verified-badge.png",
          content: verifiedBase64,
          content_type: "image/png",
          content_id: "verified-badge",
          contentId: "verified-badge",
          disposition: "inline",
        },
      ],
    }),
  });

  if (!resendRes.ok) {
    const errorBody = await resendRes.text();
    throw new Error(`Resend API returned HTTP ${resendRes.status}: ${errorBody}`);
  }

  const resendData = await resendRes.json();
  console.log(`  ✔ Resend Email Successfully Dispatched!`);
  console.log(`  📬 Message ID        : ${resendData.id}`);
  console.log(`  🎯 Target Recipient   : ${TARGET_EMAIL}`);
  console.log(`  ✨ Payment Link URL   : ${paymentLinkUrl}\n`);

  console.log("================================================================================");
  console.log("🎉 ALL OPERATIONS COMPLETED WITH REAL LIVE CLOUD APIS!");
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err.message);
  process.exit(1);
});
