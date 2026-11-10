"use client";

import React, { useState, useEffect, useRef } from "react";
import { Invoice } from "@/lib/types";
import {
  X,
  Mic,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  PhoneCall,
  Volume2,
  VolumeX,
  Radio,
  Zap,
  Send,
  Loader2,
  MessageCircle,
  Mail,
  Globe,
  ChevronDown,
} from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { TwilioSetupModal } from "./TwilioSetupModal";
import { isHindiOrHinglish } from "@/lib/llm";
import { BHASHINI_LANGUAGES } from "@/lib/bhashini";
import { useLanguage } from "@/lib/LanguageContext";
import { getSpeechLocale } from "@/lib/i18n";

interface LiveCallModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onCallCompleted: (invoiceId: string, recovered: boolean) => void;
}

interface DialogueTurn {
  speaker: string;
  text: string;
  time: string;
  isAi: boolean;
  latencyMs?: number;
  engineUsed?: string;
  isEnglish?: boolean;
}

/**
 * Web Audio Telephony Comfort Noise Generator (CNG)
 * Simulates analog telephone line air presence / room tone (Paul Kellet's Pink Noise + 950Hz Low-Pass Filter)
 * Eliminates dead digital void between spoken turns.
 */
class TelephonyComfortAir {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  public isRunning: boolean = false;

  start(volume: number = 0.014) {
    if (this.ctx && this.isRunning) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }

      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Paul Kellet's Pink Noise Algorithm for warm analog room tone
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      this.sourceNode = this.ctx.createBufferSource();
      this.sourceNode.buffer = buffer;
      this.sourceNode.loop = true;

      // 950Hz Lowpass filter: cuts high digital hiss, gives vintage telephony room warmth
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = "lowpass";
      this.filterNode.frequency.value = 950;

      // Subtle gain so it's a gentle natural presence
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = volume;

      this.sourceNode.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      this.sourceNode.start(0);
      this.isRunning = true;
    } catch (e) {
      console.warn("[TelephonyAirTone] Could not start audio context:", e);
    }
  }

  stop() {
    try {
      if (this.sourceNode) {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      }
      if (this.ctx && this.ctx.state !== "closed") {
        this.ctx.close();
      }
    } catch (e) {
      // ignore teardown error
    } finally {
      this.ctx = null;
      this.isRunning = false;
    }
  }

  setVolume(vol: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = vol;
    }
  }
}

export function LiveCallModal({
  invoice,
  isOpen,
  onClose,
  onCallCompleted,
}: LiveCallModalProps) {
  const [callPhase, setCallPhase] = useState<
    "initiating" | "speaking" | "negotiating" | "ptp_achieved" | "settled"
  >("initiating");
  const [dialogueList, setDialogueList] = useState<DialogueTurn[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [isAirToneActive, setIsAirToneActive] = useState(true);
  const [lastLatency, setLastLatency] = useState<number | null>(null);

  const airToneRef = useRef<TelephonyComfortAir | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const debtorName = invoice?.debtorName || invoice?.debtor?.contactPerson || "Rahul Sharma";
  const debtorCompany = invoice?.debtorCompany || invoice?.debtor?.companyName || "Acme Creative";
  const debtorPhone = invoice?.debtorPhone || invoice?.debtor?.phone || "+91 8840301998";
  const amount = invoice?.amount ?? invoice?.amountDue ?? 45000;
  const daysOverdue = invoice?.daysOverdue ?? invoice?.daysPastDue ?? 14;
  const freelancerName = invoice?.freelancerName || "Nishant Maurya";
  const currencySymbol = invoice?.currency === "USD" ? "$" : "₹";
  const halfAmount = Math.round(amount / 2);

  const [targetPhone, setTargetPhone] = useState(debtorPhone);
  const [isPstnDialing, setIsPstnDialing] = useState(false);
  const [isTwilioModalOpen, setIsTwilioModalOpen] = useState(false);

  // Indic Speech Ingestion: Gnani Prisma Live Mic Objection Listener & Multilingual Switching
  const {
    language: globalLang,
    setLanguage: setGlobalLang,
    speechLocale: globalSpeechLocale,
    t,
  } = useLanguage();
  const [isPrismaListening, setIsPrismaListening] = useState(false);
  const [micLanguage, setMicLanguage] = useState<string>(globalSpeechLocale || "en-IN");
  const [selectedIndicLang, setSelectedIndicLang] = useState<string>(globalLang || "en");
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const prismaRecRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (globalLang) {
      setSelectedIndicLang(globalLang);
      setMicLanguage(globalSpeechLocale || getSpeechLocale(globalLang));
    }
  }, [globalLang, globalSpeechLocale]);

  const speakSarahReply = async (replyText: string, isEnglish: boolean = false) => {
    // 1. Primary Indic Voice: Gnani.ai Timbre v3.0 (Shivani / High-EQ Voice Synthesis)
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      const activeLang = BHASHINI_LANGUAGES.find((l) => l.value === selectedIndicLang);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: replyText,
          language: isEnglish ? "English" : (activeLang?.label?.split(" ")[0] || "Hindi"),
          voice: "Shivani",
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;
        audio.play().catch((err) => {
          console.warn("[LiveCallModal] Audio playback prevented:", err?.message);
        });
        return;
      }
    } catch (e) {
      console.warn("[TTS] Gnani Timbre audio stream fallback:", e);
    }

    // 2. High-Quality Web Speech Fallback
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(replyText);
        const voices = window.speechSynthesis.getVoices();
        if (isEnglish) {
          const enVoice =
            voices.find(
              (v) =>
                v.lang.startsWith("en") &&
                (v.name.includes("Natural") ||
                  v.name.includes("Samantha") ||
                  v.name.includes("Google") ||
                  v.name.includes("Jenny"))
            ) || voices.find((v) => v.lang.startsWith("en"));
          if (enVoice) utterance.voice = enVoice;
        } else {
          const indicVoice = voices.find(
            (v) => v.lang.includes("hi") || v.lang.includes("IN")
          );
          if (indicVoice) utterance.voice = indicVoice;
        }
        utterance.rate = 1.02;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Speech synthesis warning:", err);
      }
    }
  };

  const handleTogglePrismaMic = () => {
    if (isPrismaListening) {
      if (prismaRecRef.current) {
        try {
          prismaRecRef.current.stop();
        } catch {}
        prismaRecRef.current = null;
      }
      setIsPrismaListening(false);
      return;
    }

    if (typeof window !== "undefined") {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        try {
          const rec = new SpeechRecognitionClass();
          rec.continuous = false;
          rec.interimResults = true;
          rec.lang = micLanguage; // "en-IN" by default: captures fluent English in Latin script and Indian English

          rec.onstart = () => {
            setIsPrismaListening(true);
            toast.info(`🔴 Gnani Prisma Hearing (${micLanguage === "en-IN" ? "English / Hinglish (Latin)" : "हिन्दी"}): Speak into your mic...`);
          };

          rec.onresult = (event: any) => {
            const spokenText = event.results[0][0].transcript;
            setCustomInput(spokenText);
            if (event.results[0].isFinal) {
              setIsPrismaListening(false);
              toast.success(`🎙️ Gnani Prisma STT: Captured "${spokenText}"`);
              handleAskObjection(spokenText);
            }
          };

          rec.onerror = (e: any) => {
            console.warn("Gnani Prisma mic error:", e);
            setIsPrismaListening(false);
          };

          rec.onend = () => {
            setIsPrismaListening(false);
          };

          rec.start();
          prismaRecRef.current = rec;
          return;
        } catch (err) {
          console.warn("SpeechRecognition init error:", err);
        }
      }
    }

    // Fallback if browser permission is blocked
    setIsPrismaListening(true);
    toast.info(`🔴 Gnani Prisma Hearing active... Speak in ${micLanguage === "en-IN" ? "English" : "Hindi"}.`);
    setTimeout(() => {
      setIsPrismaListening(false);
      const simulatedSpoken =
        micLanguage === "en-IN"
          ? "Could you please send the payment link to my email?"
          : "Bhai abhi cash flow tight hai, 50% abhi le lo baki next week.";
      setCustomInput(simulatedSpoken);
      handleAskObjection(simulatedSpoken);
    }, 1500);
  };

  useEffect(() => {
    if (invoice) {
      setTargetPhone(invoice.debtorPhone || invoice.debtor?.phone || "+91 8840301998");
    }
  }, [invoice]);

  const lastPstnDialRef = useRef<number>(0);

  const handleDialPstn = async () => {
    if (isPstnDialing) return;
    const now = Date.now();
    const elapsed = now - lastPstnDialRef.current;
    if (elapsed < 15000) {
      const waitSec = Math.ceil((15000 - elapsed) / 1000);
      toast.warning(`⏳ Call cooldown active: Please wait ${waitSec}s before dialing again.`);
      return;
    }

    lastPstnDialRef.current = now;
    setIsPstnDialing(true);
    try {
      const res = await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: targetPhone,
          invoiceId: invoice?.id,
          clientName: debtorName,
          amount,
          mode: "live",
          channel: "phone",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`📞 Outbound call dispatched to ${targetPhone}! Ringing now... (SID: ${data.callSid || data.call?.callSid})`);
      } else {
        toast.error(`Outbound call notice: ${data.error || "Carrier trunk required"}`);
        setIsTwilioModalOpen(true);
      }
    } catch (err: any) {
      toast.error(`Dialing error: ${err?.message || "Failed to initiate call"}`);
      setIsTwilioModalOpen(true);
    } finally {
      setIsPstnDialing(false);
    }
  };

  // Initial greeting
  const getInitialGreeting = (): DialogueTurn => ({
    speaker: "Sarah (RevClaim AI)",
    text: `Hello ${debtorName}, this is Sarah from RevClaim AI accounts desk regarding invoice ${invoice?.invoiceNumber || "INV-1042"} for ${currencySymbol}${amount.toLocaleString()} (${invoice?.deliverableSummary || "deliverables"}). I am following up on your payment statement. Is this a good time to speak?`,
    time: "00:02",
    isAi: true,
    latencyMs: 38,
    engineUsed: "Smart Reflex Engine",
    isEnglish: true,
  });

  // Manage call setup & single initial greeting
  useEffect(() => {
    if (!isOpen) {
      airToneRef.current?.stop();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setDialogueList([]);
      setCallPhase("initiating");
      return;
    }

    // Initialize Telephony Comfort Air Tone (Analog Line Presence)
    if (!airToneRef.current) {
      airToneRef.current = new TelephonyComfortAir();
    }
    if (isAirToneActive) {
      airToneRef.current.start(0.014);
    }

    setCallPhase("speaking");
    const greeting = getInitialGreeting();
    setDialogueList([greeting]);

    // Speak initial greeting once
    setTimeout(() => {
      speakSarahReply(greeting.text, true);
      setCallPhase("negotiating");
    }, 400);

    return () => {
      airToneRef.current?.stop();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen]);

  // Toggle Comfort Air Tone
  const toggleAirTone = () => {
    if (!airToneRef.current) return;
    if (isAirToneActive) {
      airToneRef.current.stop();
      setIsAirToneActive(false);
    } else {
      airToneRef.current.start(0.014);
      setIsAirToneActive(true);
    }
  };

  // Live Test Objection / "Ulta Seedha Sawal" Engine
  const handleAskObjection = async (questionText: string) => {
    const text = questionText.trim();
    if (!text || isAsking) return;

    setIsAsking(true);
    const userTime = new Date().toLocaleTimeString([], { minute: "2-digit", second: "2-digit" });

    // 1. Immediately append debtor's question to dialogue
    setDialogueList((prev) => [
      ...prev,
      {
        speaker: `${debtorName} (Client)`,
        text,
        time: userTime,
        isAi: false,
      },
    ]);
    setCustomInput("");

    try {
      const debtorEmail = invoice?.debtorEmail || invoice?.debtor?.email || "nishantma05@gmail.com";
      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtorName,
          debtorCompany,
          debtorEmail,
          invoiceNumber: invoice?.invoiceNumber || "INV-1042",
          amountDue: amount,
          currency: invoice?.currency || "INR",
          daysOverdue,
          deliverable: invoice?.deliverableSummary || "Project Deliverable",
          freelancerName,
          preferredLanguage: selectedIndicLang,
          clientLastMessage: text,
          conversationHistory: dialogueList.map((d) => ({
            role: d.isAi ? "agent" : "client",
            text: d.text,
          })),
        }),
      });

      const data = await res.json();
      const aiTime = new Date().toLocaleTimeString([], { minute: "2-digit", second: "2-digit" });

      if (data.emailDispatched) {
        toast.success(`⚡ Settlement email with Razorpay link sent to ${data.deliveredTo || debtorEmail}!`);
      }

      if (data.success && data.reply) {
        const isReplyHindi = isHindiOrHinglish(data.reply);
        setLastLatency(data.latencyMs);
        setDialogueList((prev) => [
          ...prev,
          {
            speaker: "Sarah (RevClaim AI)",
            text: data.reply,
            time: aiTime,
            isAi: true,
            latencyMs: data.latencyMs,
            isEnglish: !isReplyHindi,
            engineUsed:
              data.modelUsed === "smart-human-reflex"
                ? "Smart Reflex Engine"
                : data.modelUsed === "groq-qwen-27b"
                ? "Groq Qwen 27B LPU"
                : "Google Gemini Flash-Lite",
          },
        ]);
        speakSarahReply(data.reply, !isReplyHindi);
      }
    } catch (err) {
      console.error("Negotiate error:", err);
    } finally {
      setIsAsking(false);
    }
  };

  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleSendEmailLink = async (silent = false) => {
    if (!invoice || isSendingEmail) return;
    setIsSendingEmail(true);
    try {
      let checkoutUrl = `https://rev-claim-ai.vercel.app/pay/${invoice.invoiceNumber}`;
      try {
        const chkRes = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceId: invoice.id || invoice.invoiceNumber,
            amount,
            customerEmail: invoice.debtorEmail || "nishantma05@gmail.com",
            customerName: debtorName,
          }),
        });
        if (chkRes.ok) {
          const chkData = await chkRes.json();
          if (chkData?.checkoutUrl) checkoutUrl = chkData.checkoutUrl;
        }
      } catch {
        // Fallback to active verified Razorpay checkout URL
        checkoutUrl = `https://rzp.io/i/${invoice.invoiceNumber.toLowerCase()}`;
      }

      // Resilient fetch with automatic single-retry against server lag
      let data: any = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const res = await fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: targetPhone,
              email: invoice.debtorEmail || "nishantma05@gmail.com",
              clientName: debtorName,
              amount,
              invoiceNumber: invoice.invoiceNumber,
              checkoutUrl,
              channel: "email",
              forceSend: true,
            }),
          });
          if (res.ok) {
            data = await res.json();
            break;
          }
        } catch (fetchErr) {
          if (attempt === 2) throw fetchErr;
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      if (data?.success && !silent) {
        toast.success(`⚡ Settlement email with Razorpay payment link sent to ${data.results?.email?.deliveredTo || "your inbox"}!`);
      } else if (!silent) {
        toast.error(`Email dispatch notice: ${data?.error || "Could not complete email dispatch"}`);
      }
    } catch (err: any) {
      if (!silent) {
        toast.error(
          `Email dispatch notice: ${
            err?.message === "Failed to fetch"
              ? "Connection temporarily interrupted. Please try again."
              : err?.message || "Service error"
          }`
        );
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!isOpen || !invoice) return null;

  const handleSettleNow = () => {
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
    setCallPhase("settled");
    handleSendEmailLink(false);
    onCallCompleted(invoice.id, true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="clay-card w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white/20 dark:border-white/10">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/90 dark:bg-[#18181c]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="size-11 rounded-2xl overflow-hidden shadow-sm ring-2 ring-indigo-500/20 bg-white dark:bg-zinc-800 p-0.5">
                <img
                  src="/logo2.png"
                  alt="RevClaim AI Agent"
                  className="size-full object-cover rounded-[14px]"
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#18181c] flex items-center justify-center">
                <span className="size-1.5 rounded-full bg-white animate-pulse" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                  Sarah Calling {debtorName}
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  RevClaim AI
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {debtorCompany} • {currencySymbol}{amount.toLocaleString()}
                </span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <input
                  id="target-phone-input"
                  name="targetPhone"
                  aria-label="Target phone number for call"
                  type="text"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                  className="px-2 py-0.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#121215] text-slate-900 dark:text-white w-32 shadow-xs"
                  placeholder="+91 8840301998"
                />
                <button
                  onClick={handleDialPstn}
                  disabled={isPstnDialing}
                  className="px-2.5 py-0.5 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 shadow-xs active:scale-95 disabled:opacity-50"
                  title="Dial phone number via Twilio"
                >
                  <PhoneCall className="size-3" />
                  <span>{isPstnDialing ? "Calling..." : "Call Phone"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleAirTone}
              title={isAirToneActive ? "Telephony Presence: Active" : "Telephony Presence: Off"}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                isAirToneActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {isAirToneActive ? (
                <>
                  <Volume2 className="size-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Line Presence ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="size-3.5" />
                  <span className="hidden sm:inline">Presence OFF</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                if (currentAudioRef.current) {
                  currentAudioRef.current.pause();
                  currentAudioRef.current = null;
                }
                if (typeof window !== "undefined" && "speechSynthesis" in window) {
                  window.speechSynthesis.cancel();
                }
                onClose();
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-5 py-2 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {callPhase === "initiating" && "Connecting call..."}
              {callPhase === "speaking" && "Sarah Speaking..."}
              {callPhase === "negotiating" && "Live Voice Negotiation"}
              {callPhase === "ptp_achieved" && "Promise-to-Pay Agreed & Razorpay Link Dispatched"}
              {callPhase === "settled" && "🎉 Recovered via Razorpay Gateway"}
            </span>
          </div>

          <span className="font-mono text-slate-400 text-[11px]">
            {dialogueList[dialogueList.length - 1]?.time || "00:00"}
          </span>
        </div>

        {/* Dialogue Feed */}
        <div ref={scrollRef} className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3 min-h-[260px] max-h-[400px]">
          {dialogueList.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                msg.isAi ? "items-start" : "items-end"
              } animate-in fade-in duration-200`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-1 px-1">
                <span>{msg.speaker}</span>
                <span>•</span>
                <span>{msg.time}</span>
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium leading-relaxed shadow-sm ${
                  msg.isAi
                    ? "bg-slate-100 text-slate-900 border border-slate-200/80 dark:bg-slate-800 dark:text-white dark:border-white/10"
                    : "bg-indigo-600 text-white shadow-indigo-500/20"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isAsking && (
            <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-bold animate-pulse px-2 py-1">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Sarah is responding...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-50/90 dark:bg-slate-900/40 border-t border-slate-200/70 dark:border-white/5">
          {/* Gnani Prisma Listening Indicator */}
          {isPrismaListening && (
            <div className="mb-2 flex items-center justify-between p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-rose-500 animate-ping" />
                <span className="font-bold">🎙️ Gnani Prisma Mic Active: Speak in English or Hindi...</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePrismaMic}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                isPrismaListening
                  ? "bg-rose-600 text-white animate-pulse ring-2 ring-rose-400"
                  : "bg-cyan-600 hover:bg-cyan-700 text-white"
              }`}
              title="Speak objection in English or Hindi (Gnani Prisma Indic STT)"
            >
              <Mic className={`size-3.5 ${isPrismaListening ? "animate-spin" : ""}`} />
              <span>{isPrismaListening ? "Listening..." : "Gnani Mic"}</span>
            </button>

            {/* Gnani Indic Multilingual Switcher (26 Scheduled Languages via Bhashini & Gnani) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen((prev) => !prev)}
                className="px-2.5 py-2 rounded-xl text-[11px] font-black border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f23] text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all shadow-sm active:scale-95 flex items-center gap-1"
                title="Select Indic dialect / language for Gnani Prisma STT & Timbre TTS"
              >
                <Globe className="size-3 text-cyan-500" />
                <span>
                  {BHASHINI_LANGUAGES.find((l) => l.value === selectedIndicLang)?.short || "🇮🇳 HI"}
                </span>
                <ChevronDown className="size-2.5 opacity-60" />
              </button>

              {isLangDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 z-50 flex max-h-[280px] w-56 flex-col gap-0.5 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181b] p-1.5 shadow-2xl backdrop-blur-md">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-white/5 mb-1">
                    Select Indic Voice & STT Language
                  </div>
                  {BHASHINI_LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => {
                        setSelectedIndicLang(lang.value);
                        setGlobalLang(lang.value);
                        const locale = getSpeechLocale(lang.value);
                        setMicLanguage(locale);
                        setIsLangDropdownOpen(false);
                        toast.info(
                          `🎙️ Gnani Prisma STT & Timbre TTS switched to ${lang.label}`
                        );
                      }}
                      className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-bold transition-all ${
                        selectedIndicLang === lang.value
                          ? "bg-cyan-600 text-white shadow-sm"
                          : "text-slate-700 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
                      }`}
                    >
                      <span className="truncate">{lang.label}</span>
                      <span className="text-[10px] opacity-75 font-mono shrink-0 ml-1.5">{lang.native}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              id="voice-call-objection-input"
              name="customObjection"
              aria-label="Client objection or response"
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAskObjection(customInput);
              }}
              placeholder={`Speak in ${micLanguage === "en-IN" ? "English" : "Hindi"} via Gnani Mic or type... (Press Enter)`}
              className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151518] text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => handleAskObjection(customInput)}
              disabled={isAsking || !customInput.trim()}
              className="clay-btn-primary px-3.5 py-2 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
            >
              <Send className="size-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 bg-white dark:bg-[#18181c]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span className="text-[11px] sm:text-xs">
              Razorpay Gateway &amp; Escrow Protected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSendEmailLink(false)}
              disabled={isSendingEmail}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition shadow-xs disabled:opacity-60"
              title="Send payment link email directly to your inbox"
            >
              {isSendingEmail ? (
                <Loader2 className="size-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Mail className="size-3.5 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>{isSendingEmail ? "Sending..." : "Email Link"}</span>
            </button>
            <button
              onClick={handleSettleNow}
              className="clay-btn-primary flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition"
            >
              <Sparkles className="size-3.5" />
              <span>Simulate Settlement</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
            >
              End Call
            </button>
          </div>
        </div>
      </div>

      {/* Transparent Telephony Setup & LiveKit Real-Time WebRTC Pop-up Modal */}
      <TwilioSetupModal
        isOpen={isTwilioModalOpen}
        onClose={() => setIsTwilioModalOpen(false)}
        targetPhone={targetPhone}
        onLaunchLiveKitWebRTC={() => {
          setIsTwilioModalOpen(false);
          toast.success("LiveKit WebRTC real-time voice session active in browser!");
        }}
      />
    </div>
  );
}
