-- ============================================================================
-- RevClaim AI — Supabase Seed Data (Gnani.ai Hackathon Demo Accounts)
-- ============================================================================

-- 1. Insert Default Organization (Nishant Maurya Freelance Studio)
INSERT INTO public.organizations (id, name, email, phone, currency, razorpay_account_id)
VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Nishant Maurya Creative Engineering',
    'nishantma05@gmail.com',
    '+91 98765 43210',
    'INR',
    'acc_rzp_gnani_live'
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert Debtors
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

-- 3. Insert Invoices
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
