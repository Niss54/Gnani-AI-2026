"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Invoice } from "@/lib/types";
import { parseVoiceToInvoice, VoiceParsedInvoice } from "@/lib/voice-intake";
import { useLanguage } from "@/lib/LanguageContext";

interface GnaniVoiceIntakeProps {
  onInvoiceCreated?: (invoice: Invoice) => void;
}

export function GnaniVoiceIntake({ onInvoiceCreated }: GnaniVoiceIntakeProps) {
  const { t, speechLocale, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedData, setParsedData] = useState<VoiceParsedInvoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [micSupported, setMicSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setMicSupported(false);
      }
    }
  }, []);

  // Update parsed invoice fields in real-time as transcript changes
  useEffect(() => {
    if (transcript.trim().length > 5) {
      const parsed = parseVoiceToInvoice(transcript);
      setParsedData(parsed);
    } else {
      setParsedData(null);
    }
  }, [transcript]);

  const startListening = () => {
    setTranscript("");
    setParsedData(null);

    if (typeof window !== "undefined") {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        try {
          const rec = new SpeechRecognitionClass();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = speechLocale || "en-IN"; // Adapts dynamically to selected Indic language (hi-IN, ta-IN, te-IN, kn-IN, etc.)

          rec.onstart = () => {
            setIsListening(true);
            toast.info("🔴 Gnani Prisma Indic Voice Active: Speak naturally into your mic.");
          };

          rec.onresult = (event: any) => {
            let current = "";
            for (let i = 0; i < event.results.length; i++) {
              current += event.results[i][0].transcript;
            }
            setTranscript(current);
          };

          rec.onerror = (e: any) => {
            console.warn("Speech recognition warning:", e);
            setIsListening(false);
          };

          rec.onend = () => {
            setIsListening(false);
          };

          rec.start();
          recognitionRef.current = rec;
          return;
        } catch (err) {
          console.warn("Failed to initialize speech recognition:", err);
        }
      }
    }

    // Fallback if browser permission denied
    setIsListening(true);
    toast.info("🔴 Gnani Prisma listening... Speak invoice details.");
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleApplySample = (sampleText: string) => {
    setTranscript(sampleText);
    const parsed = parseVoiceToInvoice(sampleText);
    setParsedData(parsed);
    toast.success("Sample dictation applied to Gnani Prisma Indic Extraction engine!");
  };

  const handleCreateInvoice = async () => {
    if (!parsedData) return;
    setIsSubmitting(true);

    try {
      const payload = {
        debtorName: parsedData.debtorPerson || parsedData.clientName,
        debtorCompany: parsedData.clientName,
        debtorPhone: parsedData.phone,
        debtorEmail: parsedData.email,
        amount: parsedData.amount,
        description: parsedData.description,
        daysOverdue: parsedData.daysOverdue,
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.invoice) {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        toast.success(
          `🎙️ Gnani Prisma: Created invoice for ${parsedData.clientName} (₹${parsedData.amount.toLocaleString()})!`
        );
        if (onInvoiceCreated) {
          onInvoiceCreated(data.invoice);
        }
        setIsOpen(false);
      } else {
        toast.error("Failed to create invoice from voice data");
      }
    } catch (e: any) {
      toast.error(`Error saving voice invoice: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* ── Top Floating / Header Pill in Cockpit ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => startListening(), 200);
          }}
          className="clay-card-flat group flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-slate-200/90 bg-white/95 dark:bg-[#121824] dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="size-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-200/60 dark:border-cyan-800/60 shrink-0">
            <Mic className="size-4 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
                🎙️ {t("gnaniVoiceIntakeTitle")}
              </span>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-800">
                {t("sub400msIndicStt")}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
              {t("gnaniVoiceIntakeSubtitle")}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-[11px] font-bold shadow-2xs">
            <Sparkles className="size-3 text-indigo-500" />
            Sovereign Pipeline: Inbound (Gnani Prisma STT) • Outbound (Gnani Timbre TTS)
          </span>
        </div>
      </div>

      {/* ── Interactive Voice Intake Modal ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="clay-card relative w-full max-w-xl overflow-hidden border border-emerald-200/80 bg-white p-6 shadow-2xl dark:bg-[#18181c] dark:border-white/10">
            {/* Close Button */}
            <button
              onClick={() => {
                stopListening();
                setIsOpen(false);
              }}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <X className="size-5" />
            </button>

            {/* Header Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-800">
                <Mic className="size-3.5 text-cyan-600 animate-pulse" />
                Gnani.ai Prisma v3.0 Real-Time Indic STT
              </span>
            </div>

            {/* Title */}
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
              Speak Your Overdue Invoice
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Dictate client name, amount, and overdue days in Hindi, English, or code-mixed dialects. Gnani Prisma automatically captures verbal corrections like <em>&quot;actually make it 50k&quot;</em>!
            </p>

            {/* Listening & Waveform Box */}
            <div className="relative p-4 rounded-2xl bg-slate-100/90 border border-slate-200/90 text-slate-900 dark:bg-black/70 dark:border-white/10 dark:text-zinc-100 mb-4 overflow-hidden shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2.5 rounded-full ${
                      isListening ? "bg-rose-500 animate-ping" : "bg-slate-400"
                    }`}
                  />
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    isListening ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-400"
                  }`}>
                    {isListening ? "Listening to your mic..." : "Mic Paused"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    isListening
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {isListening ? "Stop Mic" : "Start Mic"}
                </button>
              </div>

              {/* Pulsing Audio Waves */}
              {isListening && (
                <div className="flex items-center justify-center gap-1 my-3 h-8">
                  {[40, 75, 100, 60, 90, 45, 80, 100, 65, 85, 50, 95].map((h, idx) => (
                    <span
                      key={idx}
                      className="w-1 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-pulse"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${idx * 0.08}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Live Transcript Display - Bold & High Contrast */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 font-mono text-xs text-slate-900 dark:bg-zinc-900/90 dark:border-white/10 dark:text-zinc-100 min-h-[56px] leading-relaxed shadow-xs">
                {transcript ? (
                  <span className="font-bold text-slate-950 dark:text-white">&quot;{transcript}&quot;</span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">
                    Say: &quot;Add an invoice for Apex Retail Solutions for 45 thousand due yesterday, actually make it 50 thousand.&quot;
                  </span>
                )}
              </div>
            </div>

            {/* Quick 1-Click Spoken Test Utterances */}
            <div className="mb-4">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                Click to Test Spoken Auto-Extraction Benchmark:
              </span>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleApplySample(
                      "Add an invoice for Apex Retail Solutions for 45 thousand due yesterday, actually make it 50 thousand."
                    )
                  }
                  className="text-left text-xs p-2.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-zinc-900/60 dark:hover:bg-zinc-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 transition shadow-2xs font-medium"
                >
                  🎯 <strong>Self-Correction:</strong> &quot;Add an invoice for Apex Retail Solutions for 45 thousand due yesterday, <u>actually make it 50 thousand</u>.&quot;
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplySample(
                      "Add an invoice for Nexus Digital, contact Priya Mehta, phone 8840301998, balance 65000 overdue."
                    )
                  }
                  className="text-left text-xs p-2.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-zinc-900/60 dark:hover:bg-zinc-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 transition shadow-2xs font-medium"
                >
                  ⚡ <strong>Direct Ingestion:</strong> &quot;Add an invoice for Nexus Digital, contact Priya Mehta, phone 8840301998, balance 65000 overdue.&quot;
                </button>
              </div>
            </div>

            {/* Parsed JSON Preview */}
            {parsedData && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 mb-4 animate-in fade-in">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    Structured Extraction ({Math.round(parsedData.confidence * 100)}% Confidence)
                  </span>
                  {parsedData.autoEditDetected && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 flex items-center gap-1">
                      <Zap className="size-3 text-amber-600" />
                      Auto-Edit: {parsedData.supersededAmount ? `₹${parsedData.supersededAmount.toLocaleString()} ➔ ` : ""}₹{parsedData.amount.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Company / Client</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {parsedData.clientName} {parsedData.debtorPerson ? `(${parsedData.debtorPerson})` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Amount Due</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      ₹{parsedData.amount.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Overdue Duration</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {parsedData.daysOverdue} days overdue
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Contact Phone</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {parsedData.phone}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/5">
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setIsOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateInvoice}
                disabled={!parsedData || isSubmitting}
                className="clay-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                <Zap className="size-3.5" />
                <span>{isSubmitting ? "Creating Invoice..." : "Create Invoice via Gnani Prisma"}</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
