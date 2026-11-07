"use client";

import React, { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { X, ShieldCheck, Loader2, Sparkles, ArrowRight, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDemoLogin?: () => void;
}

export function AuthModal({ isOpen, onClose, onDemoLogin }: AuthModalProps) {
  const [loadingProvider, setLoadingProvider] = useState<"github" | "google" | "demo" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDemoMode = () => {
    setLoadingProvider("demo");
    setTimeout(() => {
      if (onDemoLogin) {
        onDemoLogin();
      } else {
        toast.success("Signed in as Nishant Maurya (Founder Profile)");
      }
      setLoadingProvider(null);
      onClose();
    }, 200);
  };

  const handleOAuthSignIn = async (provider: "github" | "google") => {
    setLoadingProvider(provider);
    setErrorMsg(null);

    const supabase = getSupabase();
    if (!supabase) {
      setErrorMsg("Supabase client initialized with offline mode. Using Demo Mode is recommended.");
      setLoadingProvider(null);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setLoadingProvider(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "OAuth initiation failed");
      setLoadingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="clay-card relative w-full max-w-md overflow-hidden border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#18181c]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mx-auto mb-3 shadow-md ring-2 ring-indigo-500/20 bg-white dark:bg-zinc-800 p-0.5">
            <img
              src="/logo2.png"
              alt="RevClaim AI"
              className="w-full h-full object-cover rounded-[14px]"
            />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Sign In to RevClaim AI</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access delinquent accounts, live WebRTC telephony calls, and Razorpay settlements.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="space-y-3">
          {/* ⚡ Option 1: Demo Mode for Judges (Instant Access) */}
          <button
            type="button"
            onClick={handleDemoMode}
            disabled={loadingProvider !== null}
            className="group relative w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98] text-left border border-emerald-400/30"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 font-black text-xs shadow-xs">
                {loadingProvider === "demo" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "NM"
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-wide text-white">
                    Demo Mode for Judges
                  </span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-300/30 text-emerald-100 border border-emerald-300/40">
                    Instant Access
                  </span>
                </div>
                <span className="text-[11px] text-emerald-100/90 font-medium">
                  Login as Nishant Maurya (Live Cockpit &amp; Invoices)
                </span>
              </div>
            </div>
            <ArrowRight className="size-4 text-emerald-200 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold">
              <span className="bg-white dark:bg-[#18181c] px-2.5 text-slate-400">
                or sign in with oauth
              </span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <button
            onClick={() => handleOAuthSignIn("google")}
            disabled={loadingProvider !== null}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-slate-200 dark:bg-[#202026] dark:hover:bg-[#292932] dark:text-white dark:border-white/10 transition active:scale-95 disabled:opacity-60 shadow-xs"
          >
            {loadingProvider === "google" ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.3c0 2.9.7 5.6 1.9 8l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17C3.7 20.7 7.5 23.5 12 23.5z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* GitHub OAuth Button */}
          <button
            onClick={() => handleOAuthSignIn("github")}
            disabled={loadingProvider !== null}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-slate-700 dark:bg-[#25252c] dark:hover:bg-[#2f2f38] dark:border-white/10 transition active:scale-95 disabled:opacity-60 shadow-xs"
          >
            {loadingProvider === "github" ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            )}
            <span>Continue with GitHub</span>
          </button>
        </div>

        <div className="mt-5 text-center text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          Secured with Supabase PostgreSQL &bull; Row-Level Security (RLS)
        </div>
      </div>
    </div>
  );
}
