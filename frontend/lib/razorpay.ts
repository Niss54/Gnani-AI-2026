// ============================================================================
// RevClaim AI — Razorpay Payment Gateway Integration Module
// Primary Payment Rail: Standard Indian UPI, RuPay, Cards & NetBanking
// ============================================================================
// Supports:
// 1. Razorpay Payment Links API (v1/payment_links) with Partial Payment Milestones
// 2. Razorpay Orders API (v1/orders) for Standard In-Browser Checkout
// 3. HMAC-SHA256 Payment & Webhook Cryptographic Signature Verification
// 4. Automated Settlement Reconciliation & Platform Fee Split Accounting
// ============================================================================

import crypto from "crypto";

export interface RazorpayPaymentLinkParams {
  invoiceId: string;
  invoiceNumber: string;
  amount: number; // In INR (e.g. 50000 for ₹50,000)
  currency?: string;
  debtorName?: string;
  debtorEmail?: string;
  debtorPhone?: string;
  description?: string;
  allowPartial?: boolean;
}

export interface RazorpayPaymentLinkResponse {
  success: boolean;
  paymentLinkId: string;
  paymentUrl: string;
  shortUrl: string;
  amount: number;
  currency: string;
  status: "created" | "paid" | "partially_paid" | "expired";
  provider: "razorpay_live" | "razorpay_simulation";
  expireBy?: number;
}

export interface RazorpayOrderParams {
  invoiceId: string;
  invoiceNumber: string;
  amount: number; // in INR
  currency?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  success: boolean;
  orderId: string;
  amount: number; // in paise
  currency: string;
  status: "created" | "attempted" | "paid";
  provider: "razorpay_live" | "razorpay_simulation";
}

const getRazorpayKeyId = () => process.env.RAZORPAY_KEY_ID?.trim() || "";
const getRazorpayKeySecret = () => process.env.RAZORPAY_KEY_SECRET?.trim() || "";
const getRazorpayWebhookSecret = () => process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || "";

const RAZORPAY_BASE_URL = "https://api.razorpay.com/v1";

/**
 * Checks whether live Razorpay credentials are fully provisioned
 */
export function isRazorpayConfigured(): boolean {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  return Boolean(
    keyId &&
    keySecret &&
    !keyId.includes("your_razorpay") &&
    keyId.startsWith("rzp_")
  );
}

/**
 * Encodes Basic Auth credentials for Razorpay API calls
 */
function getBasicAuthHeader(): string {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  const token = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return `Basic ${token}`;
}

/**
 * Creates an instant Razorpay Payment Link (supports UPI, PhonePe, GPay, Paytm, Cards, NetBanking)
 * Allows partial milestone payments (50% upfront) for negotiation disputes.
 */
export async function createRazorpayPaymentLink(
  params: RazorpayPaymentLinkParams
): Promise<RazorpayPaymentLinkResponse> {
  const {
    invoiceId,
    invoiceNumber,
    amount,
    currency = "INR",
    debtorName = "Client",
    debtorEmail,
    debtorPhone,
    description,
    allowPartial = false,
  } = params;

  // Amount in Paise (e.g., ₹50,000.00 = 5,000,000 paise)
  const amountInPaise = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(amountInPaise)) throw new Error("Invalid payment amount");
  const minPartialInPaise = allowPartial ? Math.round(amount * 50) : amountInPaise; // 50% split

  if (isRazorpayConfigured()) {
    try {
      const payload = {
        amount: amountInPaise,
        currency: currency.toUpperCase(),
        accept_partial: allowPartial,
        first_min_partial_amount: minPartialInPaise,
        description:
          description || `Invoice #${invoiceNumber} Settlement via RevClaim AI (Sarah Mediation)`,
        customer: {
          name: debtorName,
          email: debtorEmail,
          contact: debtorPhone?.replace(/\s+/g, ""),
        },
        notify: {
          sms: false,
          email: false,
        },
        reminder_enable: false,
        notes: {
          invoiceId: invoiceId,
          invoiceNumber: invoiceNumber,
          source: "revclaim_ai_voice_copilot",
        },
      };

      const res = await fetch(`${RAZORPAY_BASE_URL}/payment_links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getBasicAuthHeader(),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`[Razorpay] Created live Payment Link ${data.id} -> ${data.short_url}`);
        return {
          success: true,
          paymentLinkId: data.id,
          paymentUrl: data.short_url,
          shortUrl: data.short_url,
          amount: amount,
          currency: currency,
          status: "created",
          provider: "razorpay_live",
          expireBy: data.expire_by,
        };
      } else {
        const errorText = await res.text();
        console.warn(`[Razorpay Payment Link API ${res.status}]:`, errorText);
      }
    } catch (err: any) {
      console.warn("[Razorpay Payment Link Network Error]:", err.message);
    }
  }

  throw new Error("Payment link creation unavailable; no link was confirmed.");
}

/**
 * Creates a standard Razorpay Order for in-app / modal embedded checkout
 */
export async function createRazorpayOrder(
  params: RazorpayOrderParams
): Promise<RazorpayOrderResponse> {
  const { invoiceId, invoiceNumber, amount, currency = "INR", notes = {} } = params;
  const amountInPaise = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(amountInPaise)) throw new Error("Invalid payment amount");

  if (isRazorpayConfigured()) {
    try {
      const payload = {
        amount: amountInPaise,
        currency: currency.toUpperCase(),
        receipt: `rcpt_${(invoiceNumber || invoiceId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`,
        notes: {
          ...notes,
          invoiceId,
          invoiceNumber,
        },
      };

      const res = await fetch(`${RAZORPAY_BASE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getBasicAuthHeader(),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`[Razorpay] Created live Order: ${data.id}`);
        return {
          success: true,
          orderId: data.id,
          amount: data.amount,
          currency: data.currency,
          status: "created",
          provider: "razorpay_live",
        };
      } else {
        const errorText = await res.text();
        console.warn(`[Razorpay Order API ${res.status}]:`, errorText);
      }
    } catch (err: any) {
      console.warn("[Razorpay Order Network Error]:", err.message);
    }
  }

  throw new Error("Payment order creation unavailable; no order was confirmed.");
}

/**
 * Verifies Razorpay checkout client payment signature (Order ID + Payment ID)
 */
export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = getRazorpayKeySecret();
  if (!secret) return false;

  try {
    const text = `${params.orderId}|${params.paymentId}`;
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(text)
      .digest("hex");

    return generatedSignature === params.signature;
  } catch (err) {
    console.error("[Razorpay Signature Verification Error]:", err);
    return false;
  }
}

/**
 * Verifies Razorpay Webhook HMAC-SHA256 Signature
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): { valid: boolean; reason?: string } {
  const webhookSecret = getRazorpayWebhookSecret();

  if (webhookSecret && signatureHeader) {
    try {
      const generatedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (generatedSignature !== signatureHeader) {
        return { valid: false, reason: "HMAC signature mismatch" };
      }
      return { valid: true };
    } catch (err: any) {
      return { valid: false, reason: `Verification exception: ${err.message}` };
    }
  }

  if (signatureHeader && !webhookSecret) {
    return { valid: false, reason: "RAZORPAY_WEBHOOK_SECRET not configured on server" };
  }

  return { valid: false, reason: "Missing required x-razorpay-signature header" };
}
