"use client";

import React, { useEffect, useRef } from "react";
import { CheckCircle2, TrendingUp, PhoneCall, ShieldCheck, ArrowUpRight, Sparkles } from "lucide-react";
import { CockpitStats, Invoice } from "@/lib/types";
import { GnaniVoiceIntake } from "./GnaniVoiceIntake";
import { useLanguage } from "@/lib/LanguageContext";
import gsap from "gsap";

interface CockpitProps {
  stats: CockpitStats;
  onInvoiceCreated?: (invoice: Invoice) => void;
}

export function Cockpit({ stats, onInvoiceCreated }: CockpitProps) {
  const { t } = useLanguage();
  const atRiskRef = useRef<HTMLSpanElement>(null);
  const recoveredRef = useRef<HTMLSpanElement>(null);
  const rateRef = useRef<HTMLSpanElement>(null);
  const loopsRef = useRef<HTMLSpanElement>(null);

  const totalAtRisk = stats.totalOverdueAmount || 138500;
  const totalRecovered = stats.totalRecoveredAmount ?? stats.recoveredAmount ?? 50000;
  const recoveryRate = stats.recoveryRatePercentage ?? stats.recoveryRatePercent ?? 78;
  const activeLoops = stats.inNegotiationCount ?? stats.activeChasingCount ?? 3;

  useEffect(() => {
    // GSAP Animated Counters with smooth power2.out interpolation
    const targets = [
      { ref: atRiskRef, val: totalAtRisk, isCurrency: true },
      { ref: recoveredRef, val: totalRecovered, isCurrency: true },
      { ref: rateRef, val: recoveryRate, isSuffix: "%" },
      { ref: loopsRef, val: activeLoops, isSuffix: "" },
    ];

    targets.forEach(({ ref, val, isCurrency, isSuffix }) => {
      if (!ref.current) return;
      const counter = { value: 0 };
      gsap.to(counter, {
        value: val,
        duration: 1.4,
        ease: "power2.out",
        onUpdate: () => {
          if (!ref.current) return;
          const rounded = Math.round(counter.value);
          if (isCurrency) {
            ref.current.innerText = `₹${rounded.toLocaleString()}`;
          } else if (isSuffix) {
            ref.current.innerText = `${rounded}${isSuffix}`;
          } else {
            ref.current.innerText = `${rounded}`;
          }
        },
      });
    });
  }, [totalAtRisk, totalRecovered, recoveryRate, activeLoops]);

  return (
    <div className="mb-6">
      {/* Inbound Indic Voice Intake in Cockpit (Gnani.ai Prisma v3.0 STT) */}
      <GnaniVoiceIntake onInvoiceCreated={onInvoiceCreated} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total At Risk */}
      <div className="clay-card relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
              {t("totalAtRisk")}
            </span>
          </div>
          <div className="size-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-rose-500/20 font-black">
            ₹
          </div>
        </div>

        <div className="mt-3">
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1">
            <span ref={atRiskRef}>₹{totalAtRisk.toLocaleString()}</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg w-fit border border-rose-200/60 dark:border-rose-900/50">
            <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>{stats.overdueCount ?? 3} {t("overdueAccountsPending")}</span>
          </div>
        </div>

        {/* Ambient subtle glow */}
        <div className="pointer-events-none absolute -bottom-6 -right-6 size-24 rounded-full bg-rose-500/5 blur-2xl transition-all group-hover:bg-rose-500/15" />
      </div>

      {/* 2. Cash Recovered */}
      <div className="clay-card relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
              {t("cashRecovered")}
            </span>
            <Sparkles className="size-3 text-emerald-500" />
          </div>
          <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-emerald-500/20">
            <CheckCircle2 className="size-4.5 stroke-[2.5]" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight flex items-baseline gap-1">
            <span ref={recoveredRef}>₹{totalRecovered.toLocaleString()}</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg w-fit border border-emerald-200/60 dark:border-emerald-900/50">
            <ArrowUpRight className="size-3.5" />
            <span>{t("viaRazorpayInstantSettle")}</span>
          </div>
        </div>

        <div className="pointer-events-none absolute -bottom-6 -right-6 size-24 rounded-full bg-emerald-500/5 blur-2xl transition-all group-hover:bg-emerald-500/15" />
      </div>

      {/* 3. Recovery Velocity / Rate */}
      <div className="clay-card relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
              {t("recoveryVelocity")}
            </span>
          </div>
          <div className="size-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-sky-500/20">
            <TrendingUp className="size-4.5 stroke-[2.5]" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-3xl font-black text-sky-600 dark:text-sky-400 tracking-tight flex items-baseline gap-1">
            <span ref={rateRef}>{recoveryRate}%</span>
          </div>
          {/* Recovery bar */}
          <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-500 to-cyan-400 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${recoveryRate}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <span>{t("vsEmailAvg")}</span>
            <span className="text-sky-600 dark:text-sky-400 font-bold">+60% lift</span>
          </div>
        </div>

        <div className="pointer-events-none absolute -bottom-6 -right-6 size-24 rounded-full bg-sky-500/5 blur-2xl transition-all group-hover:bg-sky-500/15" />
      </div>

      {/* 4. Active Recovery Loops */}
      <div className="clay-card relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
              {t("activeVoiceAgents")}
            </span>
          </div>
          <div className="size-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-cyan-500/20">
            <PhoneCall className="size-4.5 stroke-[2.5]" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1">
            <span ref={loopsRef}>{activeLoops}</span>
            <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">In-Flight</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-lg w-fit border border-slate-200/60 dark:border-white/10">
            <ShieldCheck className="size-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{t("stateMachineGuarded")}</span>
          </div>
        </div>

        <div className="pointer-events-none absolute -bottom-6 -right-6 size-24 rounded-full bg-cyan-500/5 blur-2xl transition-all group-hover:bg-cyan-500/15" />
      </div>
    </div>
    </div>
  );
}
