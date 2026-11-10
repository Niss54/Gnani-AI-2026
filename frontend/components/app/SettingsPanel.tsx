'use client';

import React, { useState } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Globe2,
  Lock,
  Mail,
  MessageCircle,
  Mic,
  PhoneCall,
  Save,
  Scale,
  ShieldCheck,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

export function SettingsPanel() {
  const [isSaving, setIsSaving] = useState(false);

  // Business & Recovery Settings State
  const [formData, setFormData] = useState({
    // 1. Business Profile
    orgName: 'Acme Creative Studios',
    billingEmail: 'finance@acmestudios.com',
    supportPhone: '+91 88403 01998',
    currency: 'INR',
    udyamNumber: 'UDYAM-UP-28-0091823',
    msmeShieldEnabled: true,

    // 2. Negotiation Strategy
    maxDiscount: '10',
    allowSplitInstallments: true,
    disputeCircuitBreaker: true,
    gracePeriodDays: '3',

    // 3. Telephony Strategy
    voicePersona: 'sarah_conversational',
    callingHours: 'business_hours',
    frequencyCapDays: '48',
    analogAirTone: true,

    // 4. Integrations
    razorpayAutoSplit: true,
    omnichannelWhatsappSync: true,
    resendCloudVerified: true,
    gnaniPrismaStt: true,
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Recovery settings saved! Autonomous agent rules updated.');
    }, 600);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="space-y-6 max-w-5xl w-full mx-auto pb-12"
      data-lenis-prevent
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-slate-800/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-500 text-white shadow-md">
              <Zap className="size-5" />
            </span>
            Recovery Desk & Business Controls
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure autonomous voice negotiation rules, settlement limits, calling schedules, and verified enterprise rails.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="clay-btn-primary flex items-center gap-2 self-start sm:self-auto px-5 py-2.5 text-xs font-black tracking-wide shadow-md"
        >
          {isSaving ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <Save className="size-4" />
          )}
          <span>{isSaving ? 'SAVING RULES...' : 'SAVE SETTINGS'}</span>
        </button>
      </div>

      {/* Grid of Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ── CARD 1: Business Profile & MSME Legal Identity ───────────── */}
        <div className="clay-card flex flex-col justify-between p-5 space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 dark:border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <Building2 className="size-4 text-sky-500" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Organization & MSME Identity
                </h3>
              </div>
              <span className="clay-pill bg-sky-50 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 text-[10px] font-bold">
                Tax & Legal Profile
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="settings-org-name" className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Agency / Freelancer Studio Name
                </label>
                <input
                  id="settings-org-name"
                  name="orgName"
                  type="text"
                  value={formData.orgName}
                  onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 font-semibold text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-emerald-500 dark:border-white/10 dark:bg-[#121215] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="settings-billing-email" className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Billing Contact Email
                  </label>
                  <input
                    id="settings-billing-email"
                    name="billingEmail"
                    type="email"
                    value={formData.billingEmail}
                    onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 font-medium text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-emerald-500 dark:border-white/10 dark:bg-[#121215] dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="settings-support-phone" className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Support / WhatsApp Line
                  </label>
                  <input
                    id="settings-support-phone"
                    name="supportPhone"
                    type="text"
                    value={formData.supportPhone}
                    onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 font-mono font-medium text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-emerald-500 dark:border-white/10 dark:bg-[#121215] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="settings-currency" className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Operating Currency
                  </label>
                  <select
                    id="settings-currency"
                    name="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 font-semibold text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-emerald-500 dark:border-white/10 dark:bg-[#121215] dark:text-white"
                  >
                    <option value="INR">INR (₹) — India Domestic</option>
                    <option value="USD">USD ($) — Global / US</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="settings-udyam-number" className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Udyam Registration No.
                  </label>
                  <input
                    id="settings-udyam-number"
                    name="udyamNumber"
                    type="text"
                    value={formData.udyamNumber}
                    onChange={(e) => setFormData({ ...formData, udyamNumber: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 font-mono font-semibold text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-emerald-500 dark:border-white/10 dark:bg-[#121215] dark:text-white"
                  />
                </div>
              </div>

              {/* MSME Shield Info Box */}
              <div className="flex items-center justify-between rounded-xl border border-emerald-300/80 bg-emerald-50/70 p-2.5 dark:border-emerald-900/50 dark:bg-[#14201b]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300">
                    MSMED Act 2006 (Sec 15 & 16) Statutory Compound Interest Active
                  </span>
                </div>
                <span className="clay-pill bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider">
                  PROTECTED
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 2: Autonomous Negotiation & Settlement Controls ───── */}
        <div className="clay-card flex flex-col justify-between p-5 space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 dark:border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <Sliders className="size-4 text-sky-500" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Negotiation & Settlement Rules
                </h3>
              </div>
              <span className="clay-pill bg-sky-50 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 text-[10px] font-bold">
                AI Authority Limits
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="settings-max-discount" className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Maximum Discretionary Settlement Discount
                </label>
                <select
                  id="settings-max-discount"
                  name="maxDiscount"
                  value={formData.maxDiscount}
                  onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 font-semibold text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-sky-500 dark:border-white/10 dark:bg-[#111c30] dark:text-white"
                >
                  <option value="10">Up to 10% for Instant Full Clearance (Recommended)</option>
                  <option value="5">Up to 5% Early Settlement Incentive</option>
                  <option value="15">Up to 15% Maximum Dispute Discretion</option>
                  <option value="0">Strict: Zero Discount Allowed (Full Principal Only)</option>
                </select>
              </div>

              <div>
                <label htmlFor="settings-grace-period" className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  First Voice Call Trigger Window
                </label>
                <select
                  id="settings-grace-period"
                  name="gracePeriodDays"
                  value={formData.gracePeriodDays}
                  onChange={(e) => setFormData({ ...formData, gracePeriodDays: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 font-semibold text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-sky-500 dark:border-white/10 dark:bg-[#111c30] dark:text-white"
                >
                  <option value="3">3 Days Post Due Date (Recommended Balance)</option>
                  <option value="0">Immediate (Day 1 Overdue)</option>
                  <option value="7">7 Days Courtesy Buffer</option>
                </select>
              </div>

              {/* Installment Split Toggle */}
              <label className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-[#0b1220] cursor-pointer hover:border-sky-400 transition">
                <input
                  type="checkbox"
                  checked={formData.allowSplitInstallments}
                  onChange={(e) => setFormData({ ...formData, allowSplitInstallments: e.target.checked })}
                  className="mt-0.5 size-4 rounded text-sky-600 focus:ring-sky-500"
                />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Allow 50% Upfront + 50% Net-7 Split Installment Plan
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Sarah AI will proactively offer milestone installments if the debtor reports temporary cash-flow tightness.
                  </span>
                </div>
              </label>

              {/* Dispute Circuit Breaker Toggle */}
              <label className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-[#0b1220] cursor-pointer hover:border-sky-400 transition">
                <input
                  type="checkbox"
                  checked={formData.disputeCircuitBreaker}
                  onChange={(e) => setFormData({ ...formData, disputeCircuitBreaker: e.target.checked })}
                  className="mt-0.5 size-4 rounded text-sky-600 focus:ring-sky-500"
                />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Autonomous Dispute Circuit Breaker
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    If debtor states a deliverable dispute or quality issue on the call, AI halts calls immediately and alerts billing lead.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* ── CARD 3: Voice Telephony & Calling Strategy ─────────────── */}
        <div className="clay-card flex flex-col justify-between p-5 space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 dark:border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <PhoneCall className="size-4 text-cyan-500" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Voice Telephony & Strategy
                </h3>
              </div>
              <span className="clay-pill bg-cyan-50 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300 text-[10px] font-bold">
                TRAI / FCC Compliant
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="settings-voice-persona" className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  AI Specialist Voice Persona
                </label>
                <select
                  id="settings-voice-persona"
                  name="voicePersona"
                  value={formData.voicePersona}
                  onChange={(e) => setFormData({ ...formData, voicePersona: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 font-semibold text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-emerald-500 dark:border-white/10 dark:bg-[#121215] dark:text-white"
                >
                  <option value="sarah_conversational">Sarah — Accounts Recovery Lead (Courteous & Empathetic)</option>
                  <option value="nalini_indic">Nalini — Sovereign Indic Voice (Gnani Timbre v2.5)</option>
                  <option value="marcus_senior">Marcus — Senior Commercial Mediation Officer</option>
                </select>
              </div>

              <div>
                <label htmlFor="settings-calling-hours" className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Permitted Outbound Calling Hours
                </label>
                <select
                  id="settings-calling-hours"
                  name="callingHours"
                  value={formData.callingHours}
                  onChange={(e) => setFormData({ ...formData, callingHours: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 font-semibold text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-emerald-500 dark:border-white/10 dark:bg-[#121215] dark:text-white"
                >
                  <option value="business_hours">Standard Business Hours (10:00 AM – 6:00 PM IST)</option>
                  <option value="extended_hours">Extended Work Hours (9:00 AM – 8:00 PM IST)</option>
                  <option value="banking_hours">Strict Banking Hours (10:00 AM – 4:00 PM IST)</option>
                </select>
              </div>

              <div>
                <label htmlFor="settings-frequency-cap" className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Call Anti-Spam Frequency Cap
                </label>
                <select
                  id="settings-frequency-cap"
                  name="frequencyCapDays"
                  value={formData.frequencyCapDays}
                  onChange={(e) => setFormData({ ...formData, frequencyCapDays: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 font-semibold text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-emerald-500 dark:border-white/10 dark:bg-[#121215] dark:text-white"
                >
                  <option value="48">Strict 1 call every 48 hours (Recommended)</option>
                  <option value="72">Gentle 1 call every 72 hours</option>
                  <option value="24">Escalated 1 call every 24 hours</option>
                </select>
              </div>

              {/* Analog Room Tone Simulation Toggle */}
              <label className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-[#0b1220] cursor-pointer hover:border-cyan-400 transition">
                <input
                  type="checkbox"
                  checked={formData.analogAirTone}
                  onChange={(e) => setFormData({ ...formData, analogAirTone: e.target.checked })}
                  className="mt-0.5 size-4 rounded text-cyan-600 focus:ring-cyan-500"
                />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Analog Telephony Ambient Air-Tone Simulation
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Adds natural carrier room-tone during silence so the debtor experiences a human phone call.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* ── CARD 4: Connected Enterprise Integrations ──────────────── */}
        <div className="clay-card flex flex-col justify-between p-5 space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 dark:border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <Globe2 className="size-4 text-emerald-500" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Connected Integrations & Escrow
                </h3>
              </div>
              <span className="clay-pill bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 text-[10px] font-bold">
                All Rails Online
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Rail 1: Razorpay Payment Gateway */}
              <div className="rounded-xl border border-emerald-300/80 bg-white/90 p-3 dark:border-emerald-900/50 dark:bg-[#0b1220] flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                    <CreditCard className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 dark:text-white">Razorpay Gateway</span>
                      <span className="clay-pill bg-emerald-100 text-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-300 text-[9px] font-bold">
                        VERIFIED
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      India Payment Rail • Instant UPI, RuPay, Cards, NetBanking • Auto-Settlement
                    </span>
                  </div>
                </div>
                <a
                  href="https://rzp.io/i/demo_pay"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="clay-btn flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0"
                >
                  <span>Test Link</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>

              {/* Rail 2: Omnichannel WhatsApp Automation */}
              <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3 dark:border-white/10 dark:bg-[#0b1220] flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 shrink-0">
                    <Zap className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 dark:text-white">Omnichannel WhatsApp Rail</span>
                      <span className="clay-pill bg-sky-100 text-sky-800 dark:bg-sky-950/90 dark:text-sky-300 text-[9px] font-bold">
                        CONNECTED
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      Autonomous WhatsApp Settlement Nudges &amp; Direct Razorpay Checkout Links
                    </span>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                  Active
                </span>
              </div>

              {/* Rail 3: Resend Cloud Email Delivery */}
              <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3 dark:border-white/10 dark:bg-[#151518] flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 shrink-0">
                    <Mail className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 dark:text-white">Resend Cloud Delivery</span>
                      <span className="clay-pill bg-sky-100 text-sky-800 dark:bg-sky-950/90 dark:text-sky-300 text-[9px] font-bold">
                        ACTIVE
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      Multi-Tile RFC 2046 Statements to nishantma05@gmail.com
                    </span>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                  Verified
                </span>
              </div>

              {/* Rail 4: Gnani.ai Prisma Indic Speech Engine */}
              <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3 dark:border-white/10 dark:bg-[#151518] flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 shrink-0">
                    <Mic className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 dark:text-white">Gnani.ai Prisma v3.0 STT</span>
                      <span className="clay-pill bg-teal-100 text-teal-800 dark:bg-teal-950/90 dark:text-teal-300 text-[9px] font-bold">
                        ONLINE
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      Sub-400ms Indic STT with Multilingual Code-Switching &amp; Auto-Extraction
                    </span>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                  Ready
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
