import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Invoice, Debtor, CallRecord, SettlementRecord } from "./types";

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ubpebgmzhgkzdbeblnmo.supabase.co";
  const isBrowser = typeof window !== "undefined";
  const supabaseKey = isBrowser
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("your_supabase")) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: isBrowser,
        autoRefreshToken: isBrowser,
      },
    });
  }

  return supabaseClient;
}

export async function fetchInvoicesFromSupabase(): Promise<Invoice[] | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from("invoices")
      .select(`
        id,
        invoice_number,
        amount_due,
        currency,
        due_date,
        days_past_due,
        deliverable_summary,
        status,
        payment_link_url,
        ptp_amount,
        ptp_date,
        created_at,
        updated_at,
        debtor:debtors (
          id,
          company_name,
          contact_person,
          phone,
          email,
          risk_tier,
          created_at
        )
      `)
      .order("days_past_due", { ascending: false });

    if (error) {
      console.warn("[Supabase] Query warning:", error.message);
      return null;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      debtorId: row.debtor?.id,
      debtor: row.debtor
        ? {
            id: row.debtor.id,
            companyName: row.debtor.company_name,
            contactPerson: row.debtor.contact_person,
            phone: row.debtor.phone,
            email: row.debtor.email,
            riskTier: row.debtor.risk_tier,
            createdAt: row.debtor.created_at,
          }
        : undefined,
      debtorName: row.debtor?.contact_person,
      debtorCompany: row.debtor?.company_name,
      debtorPhone: row.debtor?.phone,
      debtorEmail: row.debtor?.email,
      amountDue: Number(row.amount_due),
      amount: Number(row.amount_due),
      currency: row.currency || "INR",
      dueDate: row.due_date,
      daysPastDue: row.days_past_due,
      daysOverdue: row.days_past_due,
      deliverableSummary: row.deliverable_summary,
      description: row.deliverable_summary,
      status: row.status,
      paymentLinkUrl: row.payment_link_url,
      ptpAmount: row.ptp_amount ? Number(row.ptp_amount) : undefined,
      ptpDate: row.ptp_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.warn("[Supabase] Unexpected error:", err);
    return null;
  }
}
