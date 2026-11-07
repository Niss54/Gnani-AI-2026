"use client";

import React, { useState } from "react";
import {
  X,
  Radio,
  PhoneCall,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface TwilioSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPhone?: string;
  isCustomGated?: boolean;
  onLaunchLiveKitWebRTC: () => void;
}

export function TwilioSetupModal({
  isOpen,
  onClose,
  targetPhone = "+91 8840301998",
  isCustomGated = false,
  onLaunchLiveKitWebRTC,
}: TwilioSetupModalProps) {
  const [copied, setCopied] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  if (!isOpen) return null;

  const twilioSnippet = `TWILIO_ACCOUNT_SID=AC_YOUR_TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx`;

  const handleCopy = () => {
    navigator.clipboard.writeText(twilioSnippet);
    setCopied(true);
    toast.success("Twilio environment configuration template copied!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="clay-card relative w-full max-w-lg overflow-hidden border border-slate-200 bg-white p-6 shadow-2xl dark:bg-[#18181c] dark:border-white/10">
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          title="Close dialog"
        >
          <X className="size-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800">
            <ShieldCheck className="size-3.5 text-indigo-600" />
            Carrier Telephony Trunk
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <span>Outbound Cellular Dispatch</span>
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
          Outbound cellular calls to <strong className="font-mono text-indigo-600 dark:text-indigo-400">{targetPhone}</strong> are routed through the configured Twilio carrier trunk. You can also evaluate Sarah AI directly inside your browser via real-time WebRTC audio streaming.
        </p>

        {/* Primary Option: Real-Time LiveKit WebRTC Voice Stream */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-blue-50/50 border border-indigo-200/80 dark:from-indigo-950/40 dark:to-blue-950/30 dark:border-indigo-800/60 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Radio className="size-4 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-950 dark:text-indigo-200">
                In-Browser Real-Time WebRTC Voice Engine
              </h4>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-medium">
                Live Interactive Audio • Sub-500ms Latency • Bidirectional Audio
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">
            Experience the autonomous voice negotiation pipeline directly in your browser. Connects your microphone directly to Sarah AI with live transcription and real-time audio playback.
          </p>

          <button
            onClick={() => {
              onClose();
              onLaunchLiveKitWebRTC();
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all active:scale-95"
          >
            <Radio className="size-3.5" />
            <span>Launch In-Browser Real-Time Voice Agent</span>
          </button>
        </div>

        {/* Carrier Trunk Details */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-white/5 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <PhoneCall className="size-3.5 text-indigo-600" />
              Verified Cellular Target: <span className="font-mono text-indigo-600 dark:text-indigo-400">{targetPhone}</span>
            </span>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {showConfig ? "Hide Config" : "Carrier Trunk Info"}
            </button>
          </div>

          {showConfig && (
            <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Twilio Outbound PSTN Integration</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  <span>{copied ? "Copied" : "Copy Template"}</span>
                </button>
              </div>
              <pre className="p-2 rounded-lg bg-slate-900 text-slate-100 text-[10px] font-mono overflow-x-auto">
                {twilioSnippet}
              </pre>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-slate-400 font-medium">
            TRAI / FCC Compliant Outbound Telephony
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
