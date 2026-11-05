-- ============================================================================
-- REVCLAIM AI — COMPLETE MASTER SUPABASE DATABASE INITIALIZATION SCRIPT
-- Paste this entire script into the Supabase SQL Editor and click "RUN"
-- Project URL: https://ubpebgmzhgkzdbeblnmo.supabase.co
-- ============================================================================

-- 1. Profiles Table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    provider TEXT DEFAULT 'email',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Organizations Table (Freelancer / Creative Agency)
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

-- 3. Debtors Table (Clients with Invoices)
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

-- 4. Invoices Table (Commercial Receivables Ledger)
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

-- 5. Call Sessions Table (Telephony, ElevenLabs, Deepgram, Gnani, LiveKit Audits)
CREATE TABLE IF NOT EXISTS public.call_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('twilio', 'livekit', 'elevenlabs', 'gnani', 'deepgram', 'demo')),
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

-- 6. Settlements Table (Razorpay Webhook Events)
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    razorpay_payment_id TEXT UNIQUE NOT NULL,
    amount_recovered NUMERIC(12,2) NOT NULL,
    revclaim_fee NUMERIC(12,2) NOT NULL DEFAULT 475.00,
    payment_method TEXT DEFAULT 'upi',
    customer_email TEXT,
    settled_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Sub-Millisecond Filtering
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_debtor ON public.debtors(id);
CREATE INDEX IF NOT EXISTS idx_calls_invoice ON public.call_sessions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_settlements_invoice ON public.settlements(invoice_id);

-- ============================================================================
-- Row Level Security (RLS) Configuration
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debtors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. Organizations Policies
DROP POLICY IF EXISTS "Public read organizations" ON public.organizations;
CREATE POLICY "Public read organizations" ON public.organizations FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert organizations" ON public.organizations;
CREATE POLICY "Authenticated can insert organizations" ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update organizations" ON public.organizations;
CREATE POLICY "Authenticated can update organizations" ON public.organizations FOR UPDATE TO authenticated USING (true);

-- 3. Debtors Policies
DROP POLICY IF EXISTS "Public read debtors" ON public.debtors;
CREATE POLICY "Public read debtors" ON public.debtors FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert debtors" ON public.debtors;
CREATE POLICY "Authenticated can insert debtors" ON public.debtors FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update debtors" ON public.debtors;
CREATE POLICY "Authenticated can update debtors" ON public.debtors FOR UPDATE TO authenticated USING (true);

-- 4. Invoices Policies
DROP POLICY IF EXISTS "Public read invoices" ON public.invoices;
CREATE POLICY "Public read invoices" ON public.invoices FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert invoices" ON public.invoices;
CREATE POLICY "Authenticated can insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update invoices" ON public.invoices;
CREATE POLICY "Authenticated can update invoices" ON public.invoices FOR UPDATE TO authenticated USING (true);

-- 5. Call Sessions Policies
DROP POLICY IF EXISTS "Public read calls" ON public.call_sessions;
CREATE POLICY "Public read calls" ON public.call_sessions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert calls" ON public.call_sessions;
CREATE POLICY "Authenticated can insert calls" ON public.call_sessions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update calls" ON public.call_sessions;
CREATE POLICY "Authenticated can update calls" ON public.call_sessions FOR UPDATE TO authenticated USING (true);

-- 6. Settlements Policies
DROP POLICY IF EXISTS "Public read settlements" ON public.settlements;
CREATE POLICY "Public read settlements" ON public.settlements FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert settlements" ON public.settlements;
CREATE POLICY "Authenticated can insert settlements" ON public.settlements FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- OAuth Automatic Profile & Organization Provisioning Trigger (GitHub & Google)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_avatar TEXT;
BEGIN
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'user_name',
        SPLIT_PART(NEW.email, '@', 1)
    );

    user_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture'
    );

    INSERT INTO public.profiles (id, email, full_name, avatar_url, provider)
    VALUES (
        NEW.id,
        NEW.email,
        user_name,
        user_avatar,
        COALESCE(NEW.app_metadata->>'provider', 'email')
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW();

    INSERT INTO public.organizations (id, name, email, currency)
    VALUES (
        NEW.id,
        user_name || ' Studio',
        NEW.email,
        'INR'
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Seed Realistic Gnani.ai Hackathon Demo Invoices
-- ============================================================================
INSERT INTO public.organizations (id, name, email, phone, currency, razorpay_account_id)
VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Nishant Maurya Creative Engineering',
    'nishantma05@gmail.com',
    '+91 98765 43210',
    'INR',
    'acc_rzp_gnani_live'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.debtors (id, org_id, company_name, contact_person, phone, email, risk_tier, statutory_jurisdiction)
VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Acme Creative Studios',
    'Rahul Sharma',
    '+91 98765 43210',
    'rahul@acmestudios.in',
    'MEDIUM',
    'IN_MSME'
),
(
    '22222222-2222-2222-2222-222222222222',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Apex Retail Solutions',
    'Vikram Patel',
    '+91 91234 56789',
    'vikram@apexretail.com',
    'CRITICAL',
    'IN_MSME'
),
(
    '33333333-3333-3333-3333-333333333333',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Nexus Digital Media',
    'Priya Mehta',
    '+91 99887 76655',
    'priya@nexusmedia.agency',
    'LOW',
    'IN_MSME'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.invoices (id, org_id, debtor_id, invoice_number, amount_due, currency, due_date, days_past_due, deliverable_summary, status, payment_link_url)
VALUES
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    '11111111-1111-1111-1111-111111111111',
    'INV-1042',
    45000.00,
    'INR',
    '2026-10-15',
    14,
    'Figma UI/UX Design System & Mobile App Wireframes',
    'OVERDUE',
    'https://rzp.io/i/p_inv_1042'
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    '22222222-2222-2222-2222-222222222222',
    'INV-1043',
    28500.00,
    'INR',
    '2026-10-05',
    24,
    'Custom Shopify Liquid Theme Development & Speed Optimization',
    'OVERDUE',
    'https://rzp.io/i/p_inv_1043'
),
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    '33333333-3333-3333-3333-333333333333',
    'INV-1044',
    65000.00,
    'INR',
    '2026-09-21',
    38,
    'Motion Graphics Brand Pack & 4x Video Reels Editing',
    'OVERDUE',
    'https://rzp.io/i/p_inv_1044'
)
ON CONFLICT (id) DO NOTHING;
