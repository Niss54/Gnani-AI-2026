"use client";

import { useEffect, useRef, useState } from "react";
import { Invoice } from "@/lib/types";
import { getSupabase } from "@/lib/supabase";
import type { VoiceSnapshot, VoiceLanguage } from "@/lib/voice-client";

interface LiveCallModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onCallCompleted: (invoiceId: string, recovered: boolean) => void;
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

/** Browser speech is a preview transport, not a carrier call or a payment receipt. */
export function LiveCallModal({ invoice, isOpen, onClose, onCallCompleted }: LiveCallModalProps) {
  const [snapshot, setSnapshot] = useState<VoiceSnapshot | null>(null);
  const [language, setLanguage] = useState<VoiceLanguage>("hi-en");
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [spoken, setSpoken] = useState(true);
  const recognition = useRef<Recognition | null>(null);
  const request = useRef<AbortController | null>(null);
  const epoch = useRef(0);
  const inFlight = useRef(false);

  function cancelAudio() {
    window.speechSynthesis?.cancel();
  }
  function stopMedia() {
    epoch.current += 1;
    request.current?.abort();
    recognition.current?.abort();
    recognition.current = null;
    cancelAudio();
    inFlight.current = false;
  }
  useEffect(() => {
    setSnapshot(null); setMessages([]); setDraft(""); setError(""); setBusy(false); setListening(false);
    return stopMedia;
    // Reset both transport and state whenever the selected invoice changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, invoice?.id]);

  async function send(text?: string) {
    if (!invoice || inFlight.current || snapshot?.should_end_call) return;
    if (snapshot && !text?.trim()) return;
    inFlight.current = true; setBusy(true); setError(""); cancelAudio();
    const currentEpoch = epoch.current;
    const abort = new AbortController(); request.current = abort;
    try {
      const sb = getSupabase();
      const auth = sb ? await sb.auth.getSession() : null;
      const token = auth?.data.session?.access_token;
      if (!token) throw new Error("Sign in before starting a voice session.");
      const body = snapshot ? {
        operation: "turn", sessionId: snapshot.session_id, message: text,
        eventId: crypto.randomUUID(), sequence: snapshot.sequence + 1,
        observedStateVersion: snapshot.state_version, language,
      } : { operation: "start", invoiceId: invoice.id, requestId: crypto.randomUUID(), language };
      const response = await fetch("/api/negotiate", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body), signal: abort.signal,
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Voice request failed.");
      if (epoch.current !== currentEpoch) return;
      setSnapshot(data); setDraft("");
      setMessages(items => [...items, ...(text ? [{ role: "You", text }] : []), { role: "AI assistant", text: data.reply }]);
      if (spoken && window.speechSynthesis && data.reply) {
        const utterance = new SpeechSynthesisUtterance(data.reply);
        utterance.lang = data.language_mode === "hi-en" ? "hi-IN" : "en-IN";
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      }
      // A conversation ending does not establish receipt of money.
      if (data.should_end_call) onCallCompleted(invoice.id, data.outcome === "verified_paid");
    } catch (err) {
      if (epoch.current === currentEpoch && !abort.signal.aborted) setError(err instanceof Error ? err.message : "Voice unavailable.");
    } finally {
      if (epoch.current === currentEpoch) { setBusy(false); inFlight.current = false; }
    }
  }

  function listen() {
    if (listening) { recognition.current?.stop(); return; }
    cancelAudio(); setError("");
    const browser = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Engine = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Engine) { setError("This browser has no speech recognition. You can type below."); return; }
    const rec = new Engine(); recognition.current = rec;
    rec.lang = language === "hi-en" ? "hi-IN" : "en-IN";
    rec.continuous = true; rec.interimResults = true;
    const currentEpoch = epoch.current;
    rec.onresult = event => {
      if (epoch.current !== currentEpoch) return;
      // Retain the entire utterance. The caller reviews it before sending.
      setDraft(Array.from(event.results).map(result => result[0].transcript).join(" "));
    };
    rec.onend = () => { if (epoch.current === currentEpoch) setListening(false); };
    rec.onerror = () => { if (epoch.current === currentEpoch) { setListening(false); setError("Microphone recognition failed. Please check access or type your reply."); } };
    try { rec.start(); setListening(true); } catch { setError("Could not start microphone."); }
  }

  if (!isOpen || !invoice) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="voice-title" className="w-full max-w-2xl rounded-2xl bg-white p-6 text-slate-900 shadow-xl">
      <div className="flex items-center justify-between"><h2 id="voice-title" className="text-xl font-semibold">Voice conversation preview</h2>
        <button aria-label="Close conversation" onClick={() => { stopMedia(); onClose(); }}>Close</button></div>
      <p className="my-2 text-sm text-slate-600">Browser microphone and browser speech. Review your full reply before sending. This does not place a phone call.</p>
      <div className="flex gap-4 py-2">
        <select aria-label="Conversation language" value={language} disabled={busy || listening} onChange={e => setLanguage(e.target.value as VoiceLanguage)}>
          <option value="hi-en">Hinglish</option><option value="en-IN">English</option>
        </select>
        <label><input type="checkbox" checked={spoken} onChange={e => { setSpoken(e.target.checked); if (!e.target.checked) cancelAudio(); }} /> Read replies aloud</label>
        <button onClick={cancelAudio}>Stop audio</button>
      </div>
      <div aria-live="polite" className="my-3 max-h-80 space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-3">
        {messages.map((message, i) => <p key={i}><strong>{message.role}: </strong>{message.text}</p>)}
        {!messages.length && <p>Start a session for this invoice to begin.</p>}
      </div>
      {error && <p role="alert" className="my-2 text-red-700">{error}</p>}
      {!snapshot ? <button className="rounded bg-blue-700 px-4 py-2 text-white" disabled={busy} onClick={() => void send()}>{busy ? "Starting..." : "Start conversation"}</button> : <>
        <textarea aria-label="Your complete reply" className="w-full rounded border p-3" value={draft} disabled={busy || snapshot.should_end_call} onChange={e => setDraft(e.target.value)} maxLength={4000} />
        <div className="mt-3 flex gap-3">
          <button disabled={busy || snapshot.should_end_call} onClick={listen}>{listening ? "Finish speaking" : "Use microphone"}</button>
          <button className="rounded bg-blue-700 px-4 py-2 text-white" disabled={busy || listening || !draft.trim() || snapshot.should_end_call} onClick={() => void send(draft.trim())}>{busy ? "Listening to your reply..." : "Send complete reply"}</button>
        </div>
        {snapshot.should_end_call && <p className="mt-3">Conversation ended. Outcome: {snapshot.outcome || "closed"}.</p>}
      </>}
    </section>
  </div>;
}
