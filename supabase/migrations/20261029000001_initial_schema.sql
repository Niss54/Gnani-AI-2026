-- ============================================================================
-- RevClaim AI — Supabase Database Architecture Schema
-- ============================================================================

-- 1. Organizations (Freelancers & Creative Agencies)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    currency TEXT DEFAULT 'INR' CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP')),
    razorpay_account_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Debtors (Clients with Outstanding Commercial Invoices)
CREATE TABLE IF NOT EXISTS public.debtors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    risk_tier TEXT DEFAULT 'MEDIUM' CHECK (risk_tier IN ('LOW', 'MEDIUM', 'CRITICAL')),
    statutory_jurisdiction TEXT DEFAULT 'IN_MSME' CHECK (statutory_jurisdiction IN ('IN_MSME', 'US_NY_CA', 'UK_LATE_PAY', 'GLOBAL')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Invoices (The Core Commercial Ledger)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    debtor_id UUID REFERENCES public.debtors(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    amount_due NUMERIC(12,2) NOT NULL CHECK (amount_due > 0),
    currency TEXT DEFAULT 'INR',
    due_date DATE NOT NULL,
    days_past_due INT DEFAULT 0,
    deliverable_summary TEXT NOT NULL,
    status TEXT DEFAULT 'OVERDUE' CHECK (status IN (
        'OVERDUE', 
        'CALLING', 
        'IN_NEGOTIATION', 
        'PTP_AGREED', 
        'PTP_COMMITTED', 
        'RECOVERED', 
        'DISPUTED', 
        'LEGAL_ESCALATED'
    )),
    payment_link_url TEXT,
    ptp_amount NUMERIC(12,2),
    ptp_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Call Sessions & Voice Transcripts (Telephony / WebRTC Audits)
CREATE TABLE IF NOT EXISTS public.call_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('twilio', 'livekit', 'elevenlabs', 'gnani', 'demo')),
    call_sid TEXT,
    conversation_id TEXT,
    mode TEXT DEFAULT 'live' CHECK (mode IN ('live', 'demo')),
    call_status TEXT DEFAULT 'initiated' CHECK (call_status IN ('initiated', 'ringing', 'in_progress', 'completed', 'failed')),
    duration_seconds INT DEFAULT 0,
    sentiment TEXT DEFAULT 'cooperative' CHECK (sentiment IN ('cooperative', 'hardship', 'disputed', 'hostile')),
    ptp_amount NUMERIC(12,2),
    ptp_date TEXT,
    transcript JSONB DEFAULT '[]'::jsonb,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Settlements & Revenue Recovery (Razorpay Webhook Events)
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    razorpay_payment_id TEXT UNIQUE NOT NULL,
    amount_recovered NUMERIC(12,2) NOT NULL,
    revclaim_fee NUMERIC(12,2) NOT NULL DEFAULT 199.00,
    payment_method TEXT DEFAULT 'upi',
    customer_email TEXT,
    settled_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Performance Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_debtor ON public.invoices(debtor_id);
CREATE INDEX IF NOT EXISTS idx_calls_invoice ON public.call_sessions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_settlements_invoice ON public.settlements(invoice_id);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debtors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own organization data
CREATE POLICY "Users can manage own org" ON public.organizations
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Org members can view debtors" ON public.debtors
    FOR ALL USING (org_id IN (SELECT id FROM public.organizations WHERE id = auth.uid()));

CREATE POLICY "Org members can view invoices" ON public.invoices
    FOR ALL USING (org_id IN (SELECT id FROM public.organizations WHERE id = auth.uid()));

CREATE POLICY "Org members can view call sessions" ON public.call_sessions
    FOR ALL USING (invoice_id IN (SELECT id FROM public.invoices WHERE org_id = auth.uid()));

CREATE POLICY "Org members can view settlements" ON public.settlements
    FOR ALL USING (invoice_id IN (SELECT id FROM public.invoices WHERE org_id = auth.uid()));
