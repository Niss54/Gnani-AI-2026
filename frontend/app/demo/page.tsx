"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, AudioLines, Mic, RotateCcw, Volume2 } from "lucide-react";

type Language = "hi-en" | "en-IN";
interface Turn {
  caller: string;
  reply: string;
  intent: string;
  state: string;
  end_call: boolean;
  tool_receipts: {status: string; detail_status?: string | null; data?: {tool?: string}}[];
}
interface Recognition {
  lang: string;
  onresult: ((event: {results: ArrayLike<ArrayLike<{transcript: string}>>}) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type RecognitionEngine = new () => Recognition;
const examples = {
  "hi-en": ["Shayad Friday ko aadha pay karun. Pukka mat likhna.", "Pehle meri baat poori suno.", "Invoice ka amount galat hai."],
  "en-IN": ["Maybe I can pay half on Friday. Please don’t record that as a promise.", "Please let me finish first.", "The invoice amount is incorrect. I dispute it."],
};
const button = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:border-teal-600 disabled:opacity-50";
const label = (value: string) => value.toLowerCase().replaceAll("_", " ");

export default function VoiceDemo() {
  const [language, setLanguage] = useState<Language>("hi-en");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState({mic: false, speaker: false});
  const active = useRef<AbortController | null>(null);
  const mic = useRef<Recognition | null>(null);
  const engine = useRef<RecognitionEngine | undefined>(undefined);
  const last = turns[turns.length - 1];
  const ended = Boolean(last?.end_call) || turns.length >= 12;

  const stopAudio = () => {
    mic.current?.abort();
    mic.current = null;
    window.speechSynthesis?.cancel();
  };
  useEffect(() => {
    const w = window as Window & {SpeechRecognition?: RecognitionEngine; webkitSpeechRecognition?: RecognitionEngine};
    engine.current = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    setVoice({mic: Boolean(engine.current), speaker: "speechSynthesis" in w});
    return () => { active.current?.abort(); stopAudio(); };
  }, []);

  function reset(next = language) {
    active.current?.abort();
    active.current = null;
    stopAudio();
    setListening(false); setBusy(false); setLanguage(next); setTurns([]); setDraft(""); setError("");
  }
  function dictate() {
    if (listening) { stopAudio(); setListening(false); return; }
    const Engine = engine.current;
    if (!Engine) return;
    stopAudio();
    const rec = new Engine();
    mic.current = rec;
    rec.lang = language === "hi-en" ? "hi-IN" : "en-IN";
    rec.onresult = event => { if (mic.current === rec) setDraft(event.results[0][0].transcript.slice(0, 500)); };
    rec.onerror = () => { if (mic.current === rec) setError("Microphone unavailable. Type your message below."); };
    rec.onend = () => { if (mic.current === rec) { setListening(false); mic.current = null; } };
    try { rec.start(); setListening(true); setError(""); } catch { setError("Microphone unavailable. Type your message below."); }
  }
  function play(text: string) {
    stopAudio();
    setListening(false);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "hi-en" ? "hi-IN" : "en-IN";
    window.speechSynthesis.speak(utterance);
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    const caller = draft.trim();
    if (!caller || active.current || ended) return;
    stopAudio(); setListening(false); setError(""); setBusy(true);
    const controller = new AbortController();
    active.current = controller;
    try {
      const response = await fetch("/api/demo/turn", {method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({messages: [...turns.map(t => t.caller), caller], language}), signal: controller.signal});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The demo could not process this turn.");
      if (typeof data.reply !== "string" || typeof data.intent !== "string" || typeof data.state !== "string" || !Array.isArray(data.tool_receipts))
        throw new Error("Invalid demo response. Please try again.");
      if (active.current === controller) { setTurns(prev => [...prev, {...data, caller}]); setDraft(""); }
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Connection interrupted.");
    } finally { if (active.current === controller) { active.current = null; setBusy(false); } }
  }
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between border-b border-slate-200 pb-5">
          <span className="flex items-center gap-2 font-bold"><AudioLines aria-hidden="true" className="text-teal-700"/>RevClaim</span>
          <Link href="/" className="flex items-center gap-1 text-sm underline"><ArrowLeft size={15}/> Dashboard</Link>
        </header>
        <section className="py-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Billing conversation demo</h1>
          <p className="mt-2 text-slate-600">Try a caller’s question about Apex Studio’s fictional ₹45,000 invoice, DEMO-1042. Actions stay inside this session.</p>
        </section>
        <div className="grid items-start gap-5 md:grid-cols-[1fr_15rem]">
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium">Language <select className={button} value={language} onChange={e => reset(e.target.value as Language)}><option value="hi-en">Hinglish</option><option value="en-IN">English</option></select></label>
              <button className={button} onClick={() => reset()}><RotateCcw className="mr-1 inline" size={14}/> Restart</button>
            </div>
            <div className="my-5 space-y-4" aria-live="polite">
              {turns.map((turn, index) => <div key={index} className="space-y-3">
                <div className="ml-8 rounded-xl bg-slate-100 p-3"><strong className="block text-xs text-slate-600">Caller</strong>{turn.caller}</div>
                <div className="mr-8 rounded-xl bg-teal-50 p-3"><strong className="block text-xs text-teal-800">Agent</strong>{turn.reply}
                {voice.speaker && <button type="button" aria-label="Play reply using browser voice" onClick={() => play(turn.reply)} className="ml-2 align-middle text-teal-800"><Volume2 size={16}/></button>}</div>
              </div>)}
            </div>
            {!turns.length && <div className="mb-5 space-y-2"><p className="text-sm text-slate-600">Choose an opening or write your own.</p>{examples[language].map(text => <button key={text} className={button + " block w-full text-left"} onClick={() => setDraft(text)} disabled={busy}>{text}</button>)}</div>}
            {ended ? <p className="text-sm font-semibold">{last.end_call ? "Call ended." : "Twelve-turn demo complete."} Restart to try another conversation.</p> :
             <form onSubmit={send}>
               <label htmlFor="caller" className="text-sm font-semibold">Your message</label>
               <textarea id="caller" rows={3} value={draft} onChange={e => setDraft(e.target.value)} maxLength={500} disabled={busy} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-950"/>
               <div className="mt-3 flex justify-end gap-2">{voice.mic && <button type="button" className={button} disabled={busy} onClick={dictate}><Mic size={16} className="mr-1 inline"/>{listening ? "Stop" : "Dictate"}</button>}
               <button className="rounded-lg bg-teal-800 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={!draft.trim() || busy}>{busy ? "Listening…" : "Send"} <ArrowUpRight size={16} className="inline"/></button></div>
             </form>}
             {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
          </section>
          <aside className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Decision record</h2>
          {last ? <dl className="mt-3 space-y-3 text-sm"><div><dt>Caller intent</dt><dd className="font-semibold">{label(last.intent)}</dd></div><div><dt>Call state</dt><dd className="font-semibold">{label(last.state)}</dd></div><div><dt>Sandbox actions this conversation</dt>
          <dd className="font-semibold">{last.tool_receipts.length ? last.tool_receipts.map(r => [r.data?.tool, r.detail_status || r.status].filter(Boolean).map(v => label(v!)).join(" · ")).join(", ") : "None"}</dd></div></dl> : <p className="mt-2 text-sm text-slate-600">Send a message to see the detected intent and any action taken.</p>}</aside>
        </div>
      </div>
    </main>
  );
}
