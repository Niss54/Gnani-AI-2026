'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { RoomEvent } from 'livekit-client';
import { BHASHINI_LANGUAGES, MULTILINGUAL_RECOVERY_SUGGESTIONS } from '@/lib/bhashini';
import { useLanguage } from '@/lib/LanguageContext';
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  HeartPulse,
  Loader2,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  MessageSquare,
  Mic,
  MicOff,
  Moon,
  Navigation,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  PhoneOff,
  Plus,
  Receipt,
  Search,
  SendHorizontal,
  Settings,
  ShieldCheck,
  Signal,
  Sparkles,
  Sun,
  Trash2,
  User,
  LogIn,
  LogOut,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
  useAgent,
  useChat,
  useRoomContext,
  useSessionContext,
  useSessionMessages,
  useVoiceAssistant,
} from '@livekit/components-react';
import { AgentAudioVisualizerWave } from '@/components/agents-ui/agent-audio-visualizer-wave';
import { CallAnalyticsDashboard } from '@/components/app/call-analytics-dashboard';
import { SettingsPanel } from '@/components/app/SettingsPanel';
import { Cockpit } from '@/components/Cockpit';
import { InvoiceTable } from '@/components/InvoiceTable';
import { LiveCallModal } from '@/components/LiveCallModal';
import { InvoiceUploadModal } from '@/components/InvoiceUploadModal';
import { AuthModal } from '@/components/AuthModal';
import { HybridGraphRagModal } from '@/components/HybridGraphRagModal';
import { getSupabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';
import { LenisProvider } from '@/components/providers/LenisProvider';
import { INITIAL_INVOICES } from '@/lib/demo-data';
import { Invoice } from '@/lib/types';
import { useInputControls } from '@/hooks/agents-ui/use-agent-control-bar';
import { cn } from '@/lib/shadcn/utils';

export type DashState = 'ready' | 'connecting' | 'listening' | 'speaking' | 'ended';

export interface FacilityInfo {
  id: string;
  name: string;
  facility_type: string;
  district: string;
  state: string;
  pincode: string;
  address: string;
  lat?: number;
  lon?: number;
  opd_timings: string;
  emergency_24x7: boolean;
  contact_number: string;
  ambulance_available: boolean;
  available_doctors: string[];
  free_services: string[];
  verified_timestamp?: string;
}

interface StateMeta {
  badgeText: string;
  statusHint: string;
  dotBg: string;
  pillBg: string;
  textColor: string;
}

const STATE_CONFIG: Record<DashState, StateMeta> = {
  ready: {
    badgeText: 'ONLINE & READY',
    statusHint: 'Sarah AI is ready to negotiate',
    dotBg: 'bg-emerald-500 animate-pulse',
    pillBg: 'bg-emerald-50/90 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60',
    textColor: 'text-emerald-800 dark:text-emerald-300',
  },
  connecting: {
    badgeText: 'CONNECTING',
    statusHint: 'The agent is joining the call; please wait',
    dotBg: 'bg-sky-400 animate-ping',
    pillBg: 'bg-sky-50/90 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60',
    textColor: 'text-sky-800 dark:text-sky-300',
  },
  listening: {
    badgeText: 'LISTENING TO YOU',
    statusHint: 'Listening to you',
    dotBg: 'bg-emerald-400 animate-pulse',
    pillBg: 'bg-emerald-100/90 dark:bg-emerald-950/70',
    textColor: 'text-emerald-900 dark:text-emerald-300',
  },
  speaking: {
    badgeText: 'AGENT IS SPEAKING',
    statusHint: 'Agent is speaking',
    dotBg: 'bg-cyan-400 animate-pulse',
    pillBg: 'bg-cyan-50/90 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-800/60',
    textColor: 'text-cyan-800 dark:text-cyan-300',
  },
  ended: {
    badgeText: 'CALL ENDED',
    statusHint: 'The conversation is over',
    dotBg: 'bg-rose-500',
    pillBg: 'bg-rose-100/90 dark:bg-rose-950/70',
    textColor: 'text-rose-900 dark:text-rose-300',
  },
};

export interface ChatMessageItem {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: number;
  paymentLinkUrl?: string;
  amount?: number;
  invoiceNumber?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessageItem[];
}

const STORAGE_KEY = 'revclaim_chat_sessions_v1';

const _rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'narrow' });
function formatRelativeTime(timestamp: number): string {
  const diffSec = (timestamp - Date.now()) / 1000;
  if (Math.abs(diffSec) < 60) return 'just now';
  if (Math.abs(diffSec) < 3600) return _rtf.format(Math.round(diffSec / 60), 'minute');
  if (Math.abs(diffSec) < 86400) return _rtf.format(Math.round(diffSec / 3600), 'hour');
  return _rtf.format(Math.round(diffSec / 86400), 'day');
}

// 26 Pan-India & South Asian Languages Supported Catalogue (Bhashini + Gnani Sovereign Stack)
const LANGUAGES = BHASHINI_LANGUAGES;
const QUICK_SUGGESTIONS: Record<string, string[]> = MULTILINGUAL_RECOVERY_SUGGESTIONS;

function toChatItems(
  rawMessages: Array<{
    id: string;
    message: string;
    from?: { isLocal?: boolean };
    createdAt?: string | number | Date;
  }>
): ChatMessageItem[] {
  return rawMessages.map((m) => ({
    id: m.id,
    message: m.message,
    isUser: !!m.from?.isLocal,
    timestamp: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
  }));
}

function mergeMessages(existing: ChatMessageItem[], live: ChatMessageItem[]): ChatMessageItem[] {
  const indexMap = new Map(existing.map((m, idx) => [m.id, idx]));
  const merged = [...existing];

  for (const item of live) {
    const existingIdx = indexMap.get(item.id);
    if (existingIdx !== undefined) {
      merged[existingIdx] = {
        ...merged[existingIdx],
        message: item.message,
        timestamp: item.timestamp || merged[existingIdx].timestamp,
        paymentLinkUrl: item.paymentLinkUrl || merged[existingIdx].paymentLinkUrl,
        amount: item.amount || merged[existingIdx].amount,
        invoiceNumber: item.invoiceNumber || merged[existingIdx].invoiceNumber,
      };
    } else {
      indexMap.set(item.id, merged.length);
      merged.push(item);
    }
  }
  return merged;
}

interface NavItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  isSidebarOpen: boolean;
  onClick: () => void;
  title?: string;
  badge?: boolean;
  rightElement?: React.ReactNode;
  variant?: 'default' | 'primary';
  className?: string;
}

function NavItem({
  icon: Icon,
  label,
  active = false,
  isSidebarOpen,
  onClick,
  title,
  badge = false,
  rightElement,
  variant = 'default',
  className,
}: NavItemProps) {
  const isPrimary = variant === 'primary';
  let activeClass = 'clay-btn text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white';
  if (isPrimary) {
    activeClass = 'clay-btn-primary text-white shadow-[0_0_20px_-3px_rgba(14,165,233,0.5)]';
  } else if (active) {
    activeClass = 'clay-btn bg-slate-200 text-slate-950 font-black dark:bg-[#16243d] dark:text-white dark:border-sky-500/40 dark:shadow-[0_0_15px_-3px_rgba(14,165,233,0.25)]';
  }

  if (isSidebarOpen) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center justify-between p-2.5 text-xs font-black uppercase transition-all',
          activeClass,
          isPrimary &&
            'justify-center gap-2 py-2.5 tracking-wider hover:scale-[1.02] active:scale-95',
          className
        )}
        title={title || label}
      >
        <div className="flex items-center gap-2.5">
          <Icon className="size-4 stroke-[2.5]" />
          <span>{label}</span>
        </div>
        {rightElement}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'clay-btn relative flex size-11 items-center justify-center rounded-2xl transition-all hover:scale-105 active:scale-95',
        activeClass,
        className
      )}
      title={title || label}
    >
      <Icon className="size-5 stroke-[2.5]" />
      {badge && (
        <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-sky-500 ring-2 ring-white" />
      )}
    </button>
  );
}

// Microphone permission hook
function useMicStatus() {
  const [isDenied, setIsDenied] = useState(false);

  useEffect(() => {
    if (!navigator?.permissions) return;
    let permissionStatus: PermissionStatus | null = null;

    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((status) => {
        permissionStatus = status;
        setIsDenied(status.state === 'denied');
        status.onchange = () => {
          setIsDenied(status.state === 'denied');
        };
      })
      .catch(() => {});

    return () => {
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, []);

  return { isDenied };
}

export function SamarDashboard() {
  const { isConnected, start, end } = useSessionContext();
  const { state: vaState, audioTrack } = useVoiceAssistant();
  const { state: agentState } = useAgent();
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);
  const { send } = useChat();
  const { isDenied } = useMicStatus();
  const { microphoneToggle } = useInputControls();
  const room = useRoomContext();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const {
    language: selectedLang,
    setLanguage: setSelectedLang,
    t,
    speechLocale,
    currentLanguageInfo,
  } = useLanguage();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<{
    name: string;
    email: string;
    initials: string;
    avatarUrl?: string;
  }>({
    name: 'Nishant Maurya',
    email: 'nishant@revclaim.ai',
    initials: 'NM',
  });

  // Autonomous In-Browser Voice & Negotiation Engine (Gemini/Groq LLM + Gnani.ai TTS + Gnani Prisma STT)
  const [localMessages, setLocalMessages] = useState<ChatMessageItem[]>([]);
  const [isAutonomousActive, setIsAutonomousActive] = useState(false);
  const [autonomousPhase, setAutonomousPhase] = useState<'idle' | 'listening' | 'speaking' | 'thinking'>('idle');
  const [isPrismaListening, setIsPrismaListening] = useState(false);
  const prismaRecRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('revclaim_logged_in');
      if (stored !== null) {
        setIsLoggedIn(stored === 'true');
      }
    }

    const sb = getSupabase();
    if (sb) {
      sb.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setIsLoggedIn(true);
          const meta = session.user.user_metadata || {};
          const fullName = meta.full_name || meta.name || session.user.email?.split('@')[0] || 'Nishant Maurya';
          const email = session.user.email || 'nishant@revclaim.ai';
          const initials = fullName
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'NM';
          setProfileUser({
            name: fullName,
            email: email,
            initials: initials,
            avatarUrl: meta.avatar_url || meta.picture,
          });
        }
      });

      const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setIsLoggedIn(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem('revclaim_logged_in', 'true');
          }
          const meta = session.user.user_metadata || {};
          const fullName = meta.full_name || meta.name || session.user.email?.split('@')[0] || 'Nishant Maurya';
          const email = session.user.email || 'nishant@revclaim.ai';
          const initials = fullName
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'NM';
          setProfileUser({
            name: fullName,
            email: email,
            initials: initials,
            avatarUrl: meta.avatar_url || meta.picture,
          });
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const handleDemoLogin = () => {
    setIsLoggedIn(true);
    setProfileUser({
      name: 'Nishant Maurya',
      email: 'nishant@revclaim.ai',
      initials: 'NM',
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('revclaim_logged_in', 'true');
    }
    try {
      confetti({ particleCount: 75, spread: 65, origin: { y: 0.2 } });
    } catch (_) {}
    toast.success('Welcome back, Nishant Maurya! Demo workspace initialized.');
  };

  const handleLoginClick = () => {
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    setIsLoggedIn(false);
    setIsProfileOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('revclaim_logged_in', 'false');
    }
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.auth.signOut();
      } catch (_) {}
    }
    toast.info('Signed out successfully. Switched to guest mode.');
  };

  const [livePing, setLivePing] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatsDropdownOpen, setIsChatsDropdownOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNav, setActiveNav] = useState<'new_chat' | 'chats' | 'dashboard' | 'invoices' | 'settings'>(
    'invoices'
  );
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(INITIAL_INVOICES[0]);
  const [simulationInvoice, setSimulationInvoice] = useState<Invoice | null>(INITIAL_INVOICES[0]);
  const [isLiveCallModalOpen, setIsLiveCallModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isGraphRagModalOpen, setIsGraphRagModalOpen] = useState(false);
  // Navbar Theme state
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isForgetting, setIsForgetting] = useState(false);
  const [activeFacility, setActiveFacility] = useState<FacilityInfo | null>(null);
  const [facilityTimestamp, setFacilityTimestamp] = useState<string>('Live Public API');
  const [showFacilityMap, setShowFacilityMap] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!room) return;
    const onDataReceived = (
      payload: Uint8Array,
      _participant?: unknown,
      _kind?: unknown,
      topic?: string
    ) => {
      if (topic === 'facility_card') {
        try {
          const text = new TextDecoder().decode(payload);
          const data = JSON.parse(text);
          if (data?.facility) {
            setActiveFacility(data.facility);
            if (data.timestamp) setFacilityTimestamp(data.timestamp);
            toast.success(`Nearest facility found: ${data.facility.name}`);
          }
        } catch (err) {
          console.error('Error parsing facility_card:', err);
        }
      } else if (topic === 'escalation_card') {
        // Disputed deliverables or unresolvable hardship handed to human lead
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          if (data?.ref) {
            toast.warning(`Escalated to Billing Mediation Lead — ${data.ref}`, {
              description: `Urgency: ${data.urgency || "High"}. Lead Developer & Accounts Desk will review deliverable notes.`,
              duration: 12000,
            });
          }
        } catch (err) {
          console.error('Error parsing escalation_card:', err);
        }
      }
    };

    room.on(RoomEvent.DataReceived, onDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, onDataReceived);
    };
  }, [room]);

  const handleForgetMe = async () => {
    try {
      setIsForgetting(true);
      const res = await fetch('/api/forget', { method: 'POST' });
      if (res.ok) {
        toast.success('Personal consultation memory erased from database.');
      } else {
        toast.error('Failed to erase memory.');
      }
    } catch (err) {
      console.error('Forget me error:', err);
      toast.error('Error erasing records.');
    } finally {
      setIsForgetting(false);
    }
  };

  const isDark = mounted && (theme === 'dark' || resolvedTheme === 'dark');

  // WebRTC RTT latency — uses standard RTCPeerConnection.getStats() (browser API).
  // Engine access is cast to `any` with a silent catch so LiveKit internal refactors
  // don't break the app; ping display is cosmetic and degrades gracefully.
  // ponytail: no named public getter in livekit-client 2.x; swap to room.engine.publisherRTCPeerConnection if that lands
  useEffect(() => {
    if (!isConnected) {
      setLivePing(null);
      return;
    }
    let cancelled = false;

    const measure = async () => {
      try {
        const eng = (
          room as unknown as {
            engine?: {
              publisherRTCPeerConnection?: RTCPeerConnection;
              publisher?: { pc?: RTCPeerConnection };
            };
          }
        )?.engine;
        const pc: RTCPeerConnection | undefined =
          eng?.publisherRTCPeerConnection ?? eng?.publisher?.pc;
        if (!pc || pc.connectionState !== 'connected') return;
        for (const report of (await pc.getStats()).values()) {
          if (
            report.type === 'candidate-pair' &&
            report.nominated &&
            typeof report.currentRoundTripTime === 'number'
          ) {
            if (!cancelled) setLivePing(Math.round(report.currentRoundTripTime * 1000));
            return;
          }
        }
      } catch {
        // silently ignore — ping is cosmetic
      }
    };

    measure();
    const id = setInterval(measure, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isConnected, room]);

  // Chat input state
  const [chatInputText, setChatInputText] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load saved sessions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: ChatSession[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSessions(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
  }, []);

  // Active session object
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeChatId) || null;
  }, [sessions, activeChatId]);

  // Filtered sessions based on search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.messages.some((m) => m.message.toLowerCase().includes(q))
    );
  }, [sessions, searchQuery]);

  // Combined messages to display in the chat stream (local autonomous + livekit)
  const displayedMessages = useMemo<ChatMessageItem[]>(() => {
    const liveItems = localMessages.length > 0 ? localMessages : toChatItems(messages);
    if (!activeSession) return liveItems;
    return mergeMessages(activeSession.messages, liveItems);
  }, [localMessages, messages, activeSession]);

  // Auto-scroll to bottom as messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages]);

  // Sync autonomous local messages into persistent active chat session
  useEffect(() => {
    if (localMessages.length === 0) return;
    setSessions((prevSessions) => {
      let currentId = activeChatId;
      if (!currentId) {
        currentId = `chat_${Date.now()}`;
        setActiveChatId(currentId);
      }
      const existingIndex = prevSessions.findIndex((s) => s.id === currentId);
      let updated: ChatSession[];
      const firstUserMsg = localMessages.find((m) => m.isUser)?.message;
      const autoTitle = firstUserMsg
        ? firstUserMsg.length > 26
          ? firstUserMsg.slice(0, 26) + '...'
          : firstUserMsg
        : localMessages[0]?.message.slice(0, 26) || 'Negotiation Session';

      if (existingIndex >= 0) {
        const existing = prevSessions[existingIndex];
        const updatedSession: ChatSession = {
          ...existing,
          title: existing.title === 'New Negotiation' || existing.title === 'Negotiation Session' ? autoTitle : existing.title,
          updatedAt: Date.now(),
          messages: localMessages,
        };
        updated = [updatedSession, ...prevSessions.filter((_, i) => i !== existingIndex)];
      } else {
        const newSession: ChatSession = {
          id: currentId,
          title: autoTitle,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: localMessages,
        };
        updated = [newSession, ...prevSessions];
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [localMessages, activeChatId]);

  // Synthesize and speak Sarah's voice using Gnani.ai Indic Voice Engine (/api/tts)
  const speakSarah = async (text: string) => {
    try {
      setAutonomousPhase('speaking');
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language: currentLanguageInfo?.label?.split(' ')[0] || (selectedLang === 'hi' ? 'Hindi' : 'English'),
          languageCode: selectedLang,
          voice: 'Shivani',
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
        return;
      }
    } catch (err) {
      console.warn('[Dashboard TTS Error]:', err);
    }

    // High quality Web Speech fallback
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = speechLocale || (selectedLang === 'hi' ? 'hi-IN' : 'en-US');
        utterance.rate = 1.02;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
    }
  };

  // Gnani Prisma Speech-to-Text Listener
  const startPrismaListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      return;
    }

    try {
      if (prismaRecRef.current) {
        try {
          prismaRecRef.current.stop();
        } catch {}
      }
      const rec = new SpeechRecognitionClass();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = speechLocale || 'en-IN';

      rec.onstart = () => {
        setIsPrismaListening(true);
        toast.info(`🎙️ Gnani Prisma Mic Active (${speechLocale}): ${t('gnaniVoiceIntakeSubtitle')}`);
      };
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setChatInputText(transcript);
        if (event.results[0].isFinal) {
          setIsPrismaListening(false);
          handleSendMessage(transcript);
        }
      };
      rec.onerror = () => {
        setIsPrismaListening(false);
      };
      rec.onend = () => {
        setIsPrismaListening(false);
      };
      rec.start();
      prismaRecRef.current = rec;
    } catch (e) {
      console.warn('Gnani Prisma SpeechRecognition error:', e);
      setIsPrismaListening(false);
    }
  };

  const togglePrismaMic = () => {
    if (isPrismaListening) {
      if (prismaRecRef.current) {
        try {
          prismaRecRef.current.stop();
        } catch {}
        prismaRecRef.current = null;
      }
      setIsPrismaListening(false);
      toast.info('Microphone muted.');
    } else {
      startPrismaListening();
    }
  };

  // Start autonomous in-browser negotiation session
  const handleStartSession = async () => {
    setIsAutonomousActive(true);
    setHasStartedOnce(true);
    setAutonomousPhase('speaking');

    const greetingText = t('sarahGreeting');

    const greetingMsg: ChatMessageItem = {
      id: `msg_sarah_${Date.now()}`,
      message: greetingText,
      isUser: false,
      timestamp: Date.now(),
    };

    setLocalMessages((prev) => [...prev, greetingMsg]);
    toast.success('Autonomous voice negotiation session connected!');

    await speakSarah(greetingText);
    setAutonomousPhase('listening');
    startPrismaListening();
  };

  // End voice negotiation session
  const handleEndSession = () => {
    if (prismaRecRef.current) {
      try {
        prismaRecRef.current.stop();
      } catch {}
      prismaRecRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsAutonomousActive(false);
    setAutonomousPhase('idle');
    setIsPrismaListening(false);
    if (isConnected) {
      end();
    }
    toast.info('Negotiation session ended.');
  };

  // ChatGPT-like New Chat handler: resets to fresh Ready state
  const handleNewChat = () => {
    handleEndSession();
    setLocalMessages([]);
    setActiveChatId(null);
    setHasStartedOnce(false);
    setChatInputText('');
    setActiveNav('new_chat');
  };

  // Select a previous chat session to view/continue
  const handleSelectChat = (chat: ChatSession) => {
    handleEndSession();
    setActiveChatId(chat.id);
    setLocalMessages(chat.messages || []);
    setActiveNav('chats');
    setHasStartedOnce(true);
  };

  // Delete a chat session
  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== chatId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (activeChatId === chatId) {
      handleNewChat();
    }
  };

  // Track session timer
  useEffect(() => {
    if (isConnected || isAutonomousActive) {
      setHasStartedOnce(true);
    }
  }, [isConnected, isAutonomousActive]);

  // Handle sending chat message via Autonomous LLM + Gnani Voice Engine
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? chatInputText).trim();
    if (!text || isSendingChat) return;

    try {
      setIsSendingChat(true);
      setChatInputText('');
      setIsAutonomousActive(true);
      setHasStartedOnce(true);

      const userMsg: ChatMessageItem = {
        id: `msg_user_${Date.now()}`,
        message: text,
        isUser: true,
        timestamp: Date.now(),
      };
      setLocalMessages((prev) => [...prev, userMsg]);
      setAutonomousPhase('thinking');

      const lower = text.toLowerCase();
      const isPaymentIntent =
        lower.includes('payment') ||
        lower.includes('pay') ||
        lower.includes('link') ||
        lower.includes('razorpay') ||
        lower.includes('email') ||
        lower.includes('settle') ||
        lower.includes('upi') ||
        lower.includes('qr') ||
        lower.includes('bhej') ||
        lower.includes('receipt') ||
        lower.includes('invoice');

      let checkoutLink = 'https://rzp.io/i/demo_pay';

      if (isPaymentIntent) {
        // 1. Generate live Razorpay checkout link
        try {
          const chkRes = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              invoiceId: 'INV-1042',
              amount: 45000,
              customerEmail: 'nishantma05@gmail.com',
              customerName: 'Rahul Sharma',
            }),
          });
          if (chkRes.ok) {
            const chkData = await chkRes.json();
            if (chkData?.checkoutUrl) {
              checkoutLink = chkData.checkoutUrl;
            }
          }
        } catch (e) {
          console.warn('Checkout link generation fallback:', e);
        }

        // 2. Dispatch real multi-tile settlement statement to nishantma05@gmail.com via Resend & WhatsApp
        try {
          const notifyRes = await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: '+918840301998',
              email: 'nishantma05@gmail.com',
              clientName: 'Rahul Sharma',
              invoiceNumber: 'INV-1042',
              amount: 45000,
              checkoutUrl: checkoutLink,
              channel: 'both',
              deliverable: 'Full-Stack AI Voice Agents & Next.js Cockpit Architecture',
              debtorCompany: 'Acme Creative Studios',
              daysOverdue: 14,
            }),
          });
          if (notifyRes.ok) {
            toast.success('⚡ Official Razorpay settlement statement delivered to nishantma05@gmail.com & WhatsApp!');
          }
        } catch (e) {
          console.warn('Notification dispatch fallback:', e);
        }
      }

      const res = await fetch('/api/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          debtorName: 'Rahul Sharma',
          invoiceNumber: 'INV-1042',
          amountDue: 45000,
          currency: 'INR',
          preferredLanguage: selectedLang,
          conversationHistory: [...localMessages, userMsg].map((m) => ({
            role: m.isUser ? 'user' : 'assistant',
            content: m.message,
          })),
        }),
      });

      let replyText = t('sarahPaymentDispatchedFallback');

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          replyText = data.reply;
        }
      }

      const sarahMsg: ChatMessageItem = {
        id: `msg_sarah_${Date.now()}`,
        message: replyText,
        isUser: false,
        timestamp: Date.now(),
        paymentLinkUrl: isPaymentIntent ? checkoutLink : undefined,
        amount: isPaymentIntent ? 45000 : undefined,
        invoiceNumber: isPaymentIntent ? 'INV-1042' : undefined,
      };
      setLocalMessages((prev) => [...prev, sarahMsg]);

      // Speak reply via Gnani.ai Indic voice!
      await speakSarah(replyText);
    } catch (error) {
      console.error('Error negotiating turn:', error);
    } finally {
      setIsSendingChat(false);
      setAutonomousPhase('listening');
      startPrismaListening();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Compute state
  const dashState = useMemo<DashState>(() => {
    if (isAutonomousActive) {
      if (autonomousPhase === 'speaking') return 'speaking';
      if (autonomousPhase === 'thinking') return 'connecting';
      return 'listening';
    }
    if (isConnected) {
      const stateString = (agentState ?? vaState ?? '').toString();
      switch (stateString) {
        case 'connecting':
        case 'initializing':
          return 'connecting';
        case 'speaking':
          return 'speaking';
        case 'listening':
        case 'thinking':
        default:
          return 'listening';
      }
    }
    return hasStartedOnce ? 'ended' : 'ready';
  }, [isAutonomousActive, autonomousPhase, isConnected, agentState, vaState, hasStartedOnce]);

  const stateMeta = STATE_CONFIG[dashState];

  return (
    <LenisProvider>
      <div className="flex h-screen w-full gap-3 overflow-hidden bg-gradient-to-br from-[#E8EEF5] via-[#EDF2F7] to-[#DFE7F0] p-3 font-sans text-zinc-800 transition-colors duration-200 selection:bg-sky-400 selection:text-black md:p-4 dark:from-[#070A12] dark:via-[#090E1A] dark:to-[#05080F] dark:text-zinc-100">
      {/* ── Left Collapsible Clay Sidebar (Full Height, Connected) ─────────── */}
      <motion.aside
        animate={{ width: isSidebarOpen ? 260 : 72 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          'clay-card flex shrink-0 flex-col justify-between overflow-hidden transition-[padding] duration-200',
          isSidebarOpen ? 'w-[260px] p-3.5' : 'w-[72px] items-center p-2.5'
        )}
      >
        {/* Top Section */}
        <div className="flex w-full flex-col">
          {/* Operator Card / Collapsed Icon (Matching Screenshot Top Bar) */}
          {isSidebarOpen ? (
            <div className="clay-card-flat flex items-center justify-between gap-2 p-1.5">
              {/* Left: Circular RevClaim Logo + REVCLAIM AI */}
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-sm ring-1 ring-slate-200/80 dark:ring-white/10">
                  <Image
                    src="/logo2.png"
                    alt="RevClaim AI Logo"
                    width={36}
                    height={36}
                    className="size-full object-cover"
                  />
                </div>
                <span className="truncate text-xs font-black tracking-tight text-slate-900 uppercase dark:text-slate-100">
                  REVCLAIM AI
                </span>
              </div>

              {/* Right: Circular Search & Circular Sidebar Collapse Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  className={cn(
                    'clay-btn flex size-8 shrink-0 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 text-slate-700 hover:text-slate-950 dark:text-zinc-200 dark:hover:text-white',
                    isSearchOpen && 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950/70 dark:text-emerald-200'
                  )}
                  title="Search chats"
                  aria-label="Search chats"
                >
                  <Search className="size-3.5 stroke-[2.5]" />
                </button>
                <button
                  onClick={() => {
                    setIsSidebarOpen(false);
                    setIsSearchOpen(false);
                  }}
                  className="clay-btn flex size-8 shrink-0 items-center justify-center rounded-full text-slate-700 transition-all hover:scale-105 hover:text-slate-950 active:scale-95 dark:text-zinc-200 dark:hover:text-white"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="size-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="group relative mx-auto flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-sm ring-2 ring-sky-300/40 transition-all hover:scale-105 active:scale-95 dark:ring-cyan-500/30"
                title="Open sidebar (RevClaim AI)"
                aria-label="Open sidebar"
              >
                {/* Default: RevClaim Logo */}
                <Image
                  src="/logo2.png"
                  alt="RevClaim AI Logo"
                  width={44}
                  height={44}
                  className="size-full object-cover transition-all duration-200 group-hover:scale-75 group-hover:opacity-0"
                />
                {/* Hover: Sidebar Expand Icon */}
                <PanelLeftOpen className="absolute size-5 stroke-[2.5] text-slate-900 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 dark:text-cyan-400" />
              </button>
            </div>
          )}

          {/* Quick Search Input (when Search is clicked) */}
          <AnimatePresence>
            {isSidebarOpen && isSearchOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="mt-2"
              >
                <div className="clay-card-flat flex items-center gap-1.5 px-2.5 py-1.5">
                  <Search className="size-3.5 shrink-0 text-slate-400" />
                  <input
                    id="sidebar-chat-search"
                    name="searchQuery"
                    aria-label="Search past negotiations"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search chats..."
                    className="w-full bg-transparent text-[11px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 1. New Chat Button */}
          <NavItem
            icon={Plus}
            label={t('newChat')}
            variant="primary"
            isSidebarOpen={isSidebarOpen}
            onClick={handleNewChat}
            title={isSidebarOpen ? 'Start a new chat session' : 'New Chat'}
            className="mt-3"
          />

          {/* Nav Menu Items */}
          <div className={cn('mt-3 flex flex-col gap-1.5', !isSidebarOpen && 'items-center')}>
            {/* 2. Chats (with collapsible dropdown for history) */}
            <div className={cn('flex flex-col gap-1', isSidebarOpen && 'w-full')}>
              <NavItem
                icon={MessageSquare}
                label={t('chats')}
                active={activeNav === 'chats'}
                isSidebarOpen={isSidebarOpen}
                onClick={() => {
                  if (!isSidebarOpen) {
                    setIsSidebarOpen(true);
                    setIsChatsDropdownOpen(true);
                  } else {
                    setIsChatsDropdownOpen((prev) => !prev);
                  }
                  setActiveNav('chats');
                }}
                title={
                  isSidebarOpen ? 'Chats & Session History' : 'Chats (Click to expand history)'
                }
                badge={!isSidebarOpen}
                rightElement={
                  <ChevronDown
                    className={cn(
                      'size-3.5 stroke-[2.5] text-slate-600 transition-transform duration-200',
                      isChatsDropdownOpen && 'rotate-180'
                    )}
                  />
                }
              />

              {/* Dropdown Chat History List */}
              <AnimatePresence>
                {isSidebarOpen && isChatsDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="clay-inset flex max-h-56 flex-col gap-1 overflow-y-auto rounded-2xl p-1.5"
                  >
                    {filteredSessions.length === 0 ? (
                      <div className="py-3 text-center font-mono text-[10px] font-bold text-slate-400">
                        {searchQuery ? 'NO MATCHING CHATS' : 'NO RECENT CHATS YET'}
                      </div>
                    ) : (
                      filteredSessions.map((chat) => {
                        const isActive = chat.id === activeChatId;
                        return (
                          <div
                            key={chat.id}
                            onClick={() => handleSelectChat(chat)}
                            className={cn(
                              'group flex w-full cursor-pointer items-center justify-between rounded-xl p-2 text-left transition-all active:scale-[0.98]',
                              isActive
                                ? 'bg-sky-100/90 ring-1 ring-sky-300 dark:bg-cyan-950/60 dark:ring-cyan-600/60'
                                : 'hover:bg-white/80 dark:hover:bg-slate-800/60'
                            )}
                          >
                            <div className="min-w-0 flex-1 overflow-hidden pr-1">
                              <div className="flex w-full items-center justify-between gap-1">
                                <span
                                  className={cn(
                                    'truncate text-[11px] font-black',
                                    isActive
                                      ? 'text-sky-950 dark:text-cyan-200'
                                      : 'text-slate-800 dark:text-slate-200'
                                  )}
                                >
                                  {chat.title}
                                </span>
                              </div>
                              <div className="mt-0.5 flex items-center justify-between gap-1 font-mono text-[9px] text-slate-400 dark:text-slate-500">
                                <span>{formatRelativeTime(chat.updatedAt)}</span>
                                <span>{chat.messages.length} msgs</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteChat(e, chat.id)}
                              className="p-1 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-600"
                              title="Delete chat"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 3. Invoices Cockpit */}
            <NavItem
              icon={FileText}
              label={t('invoicesAndRecovery')}
              active={activeNav === 'invoices'}
              isSidebarOpen={isSidebarOpen}
              onClick={() => setActiveNav('invoices')}
              title="Invoices & Debtor Cockpit"
            />

            {/* 4. Dashboard */}
            <NavItem
              icon={Activity}
              label={t('dashboard')}
              active={activeNav === 'dashboard'}
              isSidebarOpen={isSidebarOpen}
              onClick={() => setActiveNav('dashboard')}
              title="Dashboard"
            />

            {/* 4. Settings */}
            <NavItem
              icon={Settings}
              label={t('settings')}
              active={activeNav === 'settings'}
              isSidebarOpen={isSidebarOpen}
              onClick={() => setActiveNav('settings')}
              title="Settings"
            />

            {/* 5. Hybrid Graph RAG Explorer */}
            <NavItem
              icon={Network}
              label={t('graphRag')}
              active={isGraphRagModalOpen}
              isSidebarOpen={isSidebarOpen}
              onClick={() => setIsGraphRagModalOpen(true)}
              title="Sovereign Hybrid Graph RAG Explorer & Corporate Veil Piercing"
            />
          </div>
        </div>

        {/* ── Sidebar Bottom User Card ────────────────────────────────────── */}
        <div className="mt-auto pt-3 border-t border-slate-200/60 dark:border-slate-800/60 w-full">
          {isSidebarOpen ? (
            <div className="clay-card-flat flex items-center justify-between p-2">
              <div 
                onClick={isLoggedIn ? () => setActiveNav('settings') : handleLoginClick}
                className="flex items-center gap-2 overflow-hidden cursor-pointer group"
                title={isLoggedIn ? "Account Profile" : "Click to Sign In"}
              >
                <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-cyan-500 text-xs font-black text-white shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
                  {isLoggedIn ? (
                    profileUser.avatarUrl ? (
                      <img src={profileUser.avatarUrl} alt={profileUser.name} className="size-full object-cover" />
                    ) : (
                      profileUser.initials
                    )
                  ) : (
                    <User className="size-4" />
                  )}
                  {isLoggedIn && (
                    <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                  )}
                </div>
                <div className="truncate text-left">
                  <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                    {isLoggedIn ? profileUser.name : 'Guest Mode'}
                  </p>
                  <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 font-bold">
                    {isLoggedIn ? 'PRO FOUNDER' : 'CLICK TO LOGIN'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={isLoggedIn ? handleLogout : handleLoginClick}
                className="clay-btn p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                title={isLoggedIn ? "Sign Out" : "Sign In"}
              >
                {isLoggedIn ? <LogOut className="size-3.5" /> : <LogIn className="size-3.5 text-sky-500" />}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={isLoggedIn ? () => setActiveNav('settings') : handleLoginClick}
                className="relative flex size-10 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-cyan-500 text-xs font-black text-white shadow-sm hover:scale-105 active:scale-95 overflow-hidden"
                title={isLoggedIn ? `${profileUser.name} (Click for Settings)` : "Sign In"}
              >
                {isLoggedIn ? (
                  profileUser.avatarUrl ? (
                    <img src={profileUser.avatarUrl} alt={profileUser.name} className="size-full object-cover" />
                  ) : (
                    profileUser.initials
                  )
                ) : (
                  <LogIn className="size-4" />
                )}
                {isLoggedIn && (
                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                )}
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* ── Right Main Area (Connected Top Header + Workspace) ─────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ── Top Header (Shadcn Router Breadcrumbs on Left, Language + Theme + GitHub on Right) ── */}
        <header className="clay-card mb-3 flex h-14 shrink-0 items-center justify-between px-4 md:px-5">
          {/* Left: Shadcn-style Router Breadcrumbs */}
          <div className="flex items-center gap-2">
            {/* Breadcrumb Path */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"
            >
              <button
                onClick={() => setActiveNav('invoices')}
                className="group flex items-center gap-2 transition-all hover:opacity-85"
                title="RevClaim AI Dashboard"
              >
                <Image
                  src="/logo2.png"
                  alt="RevClaim AI Logo"
                  width={24}
                  height={24}
                  className="size-6 rounded-full object-cover shadow-xs"
                />
                <span className="text-[13px] font-black tracking-tight text-slate-900 dark:text-white">
                  RevClaim<span className="text-sky-500 dark:text-sky-400">.ai</span>
                </span>
              </button>

              <span className="font-mono text-slate-300 dark:text-slate-600">/</span>

              {activeNav === 'invoices' && (
                <span className="font-bold text-slate-900 dark:text-slate-100">{t('invoicesAndRecovery')}</span>
              )}

              {activeNav === 'dashboard' && (
                <span className="font-bold text-slate-900 dark:text-slate-100">{t('dashboard')}</span>
              )}

              {activeNav === 'new_chat' && (
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {t('newChat')}
                </span>
              )}

              {activeNav === 'chats' && (
                <>
                  <button
                    onClick={() => {
                      setIsChatsDropdownOpen(true);
                      if (!isSidebarOpen) setIsSidebarOpen(true);
                    }}
                    className="transition-colors hover:text-slate-900 dark:hover:text-white"
                  >
                    {t('chats')}
                  </button>
                  {activeSession && (
                    <>
                      <span className="font-mono text-slate-300">/</span>
                      <span className="max-w-[130px] truncate font-bold text-slate-900 sm:max-w-[200px] md:max-w-[280px] dark:text-slate-100">
                        {activeSession.title}
                      </span>
                    </>
                  )}
                </>
              )}

              {activeNav === 'settings' && (
                <span className="font-bold text-slate-900 dark:text-slate-100">{t('settings')}</span>
              )}
            </nav>
          </div>

          {/* Right: Forget Me link, Language Toggle, Theme Toggle, View GitHub */}
          <div className="flex items-center gap-2.5">
            {/* Sovereign Hybrid Graph RAG Launch Pill */}
            <button
              onClick={() => setIsGraphRagModalOpen(true)}
              className="clay-btn hidden sm:flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold text-sky-700 bg-sky-50/70 dark:bg-[#111c30] border border-sky-200/80 dark:border-white/10 dark:text-sky-300 transition-all hover:scale-105 active:scale-95 shadow-xs"
              title="Explore Sovereign Hybrid Graph RAG & Pierced Corporate Veil"
            >
              <Network className="size-3.5 text-sky-600 dark:text-sky-400" />
              <span>{t('graphRag')}</span>
            </button>

            {/* Underlined Forget Me Button */}
            <button
              onClick={handleForgetMe}
              disabled={isForgetting}
              className="flex cursor-pointer items-center gap-1.5 px-2 py-1 text-xs font-bold text-rose-600 underline decoration-rose-400 underline-offset-4 transition-all hover:text-rose-700 hover:decoration-rose-600 active:scale-95 disabled:opacity-50 dark:text-rose-400 dark:decoration-rose-500 dark:hover:text-rose-300"
              title="Permanently wipe stored negotiation memory and session data"
              aria-label="Forget My Memory"
            >
              {isForgetting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5 stroke-[2.2]" />
              )}
              <span>{t('forgetMe')}</span>
            </button>

            {/* Language selector — add entries to LANGUAGES to support more */}
            <div className="relative">
              <button
                onClick={() => setIsLangOpen((p) => !p)}
                className="clay-btn flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold text-slate-700 transition-all hover:text-slate-950 dark:text-slate-200 dark:hover:text-white"
                aria-label="Select language"
              >
                <span>
                  {LANGUAGES.find((l) => l.value === selectedLang)?.short ??
                    selectedLang.toUpperCase()}
                </span>
                <ChevronDown
                  className={cn(
                    'size-3 stroke-[2.5] text-slate-400 transition-transform duration-150',
                    isLangOpen && 'rotate-180'
                  )}
                />
              </button>
              {isLangOpen && (
                <div className="clay-card absolute right-0 z-50 mt-1.5 flex max-h-[380px] min-w-[220px] flex-col gap-0.5 overflow-y-auto p-1.5 shadow-xl">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => {
                        setSelectedLang(l.value);
                        setIsLangOpen(false);
                        if (typeof document !== 'undefined') {
                          document.cookie = `revclaim_lang=${l.value}; Path=/; SameSite=Lax`;
                        }
                        if (room && isConnected && room.localParticipant) {
                          try {
                            const payload = new TextEncoder().encode(
                              JSON.stringify({ type: 'language_change', language: l.value })
                            );
                            room.localParticipant.publishData(payload, {
                              reliable: true,
                              topic: 'language_change',
                            });
                          } catch (langErr) {
                            console.debug('Failed to publish language change:', langErr);
                          }
                        }
                      }}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-bold transition-all',
                        l.value === selectedLang
                          ? 'clay-btn-primary text-white'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                      )}
                    >
                      <span>{l.label}</span>
                      <span className="text-[10px] opacity-70 font-mono ml-2">{l.short}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Theme Toggle */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="clay-btn flex size-8.5 items-center justify-center rounded-xl text-slate-700 transition-transform hover:scale-105 hover:text-slate-950 active:scale-95"
              title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
              aria-label="Toggle theme"
            >
              {mounted && isDark ? (
                <Sun className="size-4 stroke-[2.5] text-amber-400" />
              ) : (
                <Moon className="size-4 stroke-[2.5] text-slate-700 dark:text-slate-300" />
              )}
            </button>

            {/* 3. View GitHub */}
            <a
              href="https://github.com/Niss54/Gnani-AI-2026"
              target="_blank"
              rel="noopener noreferrer"
              className="clay-btn flex size-8.5 items-center justify-center rounded-xl text-slate-700 transition-transform hover:scale-105 hover:text-slate-950 active:scale-95"
              title="View on GitHub"
              aria-label="View on GitHub"
            >
              <svg
                className="size-4 fill-current"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>

            {/* 4. User Profile & Login/Logout System */}
            <div className="relative ml-1">
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((p) => !p)}
                  className="clay-btn flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95"
                  title="User Account Menu"
                  aria-label="User Account"
                >
                  <div className="relative flex size-6.5 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-cyan-500 text-[10px] font-black text-white shadow-xs overflow-hidden">
                    {profileUser.avatarUrl ? (
                      <img src={profileUser.avatarUrl} alt={profileUser.name} className="size-full object-cover" />
                    ) : (
                      profileUser.initials
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                  </div>
                  <span className="hidden font-bold text-[11px] text-slate-800 sm:inline dark:text-slate-200">
                    {profileUser.name.split(' ')[0]}
                  </span>
                  <ChevronDown
                    className={cn(
                      'size-3 text-slate-400 transition-transform duration-150',
                      isProfileOpen && 'rotate-180'
                    )}
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLoginClick}
                  className="clay-btn-primary flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-black text-white tracking-wider transition-all hover:scale-105 active:scale-95 shadow-xs"
                  title="Sign In with Google / GitHub or Demo Mode"
                >
                  <LogIn className="size-3.5" />
                  <span>SIGN IN</span>
                </button>
              )}

              {/* Profile Dropdown Menu */}
              {isLoggedIn && isProfileOpen && (
                <div className="clay-card absolute right-0 z-50 mt-1.5 flex min-w-[210px] flex-col gap-1 p-2 shadow-2xl">
                  <div className="border-b border-slate-200/80 px-2 py-1.5 pb-2 dark:border-slate-800/80">
                    <p className="text-xs font-black text-slate-900 dark:text-white">{profileUser.name}</p>
                    <p className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      {profileUser.email}
                    </p>
                    <span className="mt-1 inline-block rounded-md border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[9px] font-black text-sky-600 dark:text-sky-300">
                      FOUNDER &bull; PRO
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveNav('settings');
                      setIsProfileOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Settings className="size-3.5 text-slate-400" />
                    <span>Settings &amp; Keys</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  >
                    <LogOut className="size-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Microphone Error Warning Banner ────────────────────────────────── */}
        <AnimatePresence>
          {isDenied && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 12 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className="clay-card overflow-hidden border-rose-200/80 bg-rose-50/95 dark:bg-[#121c2c] dark:border-rose-500/30 px-5 py-3"
            >
              <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 text-xs font-bold text-rose-950 dark:text-rose-200">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="size-5 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>
                    MICROPHONE BLOCKED: The AI agent cannot hear your voice until microphone permissions
                    are enabled.
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigator.mediaDevices?.getUserMedia({ audio: true }).catch(() => {});
                  }}
                  className="clay-btn shrink-0 bg-white dark:bg-[#16233b] px-4 py-1 text-xs font-black text-rose-900 dark:text-rose-200"
                >
                  RETRY ACCESS
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* ── Main Workspace Grid ────────────────────────────────────────────── */}
        <main className="flex flex-1 gap-3 overflow-hidden">
          {activeNav === 'dashboard' ? (
            <CallAnalyticsDashboard />
          ) : activeNav === 'invoices' ? (
            <section className="clay-card flex flex-1 flex-col overflow-y-auto p-4 md:p-6" data-lenis-prevent>
              <div className="space-y-6 max-w-6xl w-full mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/80 pb-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {t('delinquentCockpitTitle')}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {t('delinquentCockpitSubtitle')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveNav('new_chat');
                        toast.info('Starting autonomous voice recovery session...');
                      }}
                      className="clay-btn-primary flex items-center gap-2 px-4 py-2 text-xs font-black uppercase shadow-md transition-all hover:scale-105 active:scale-95"
                    >
                      <Phone className="size-3.5 stroke-[2.5]" />
                      <span>{t('startVoiceNegotiation')}</span>
                    </button>
                  </div>
                </div>

                <Cockpit
                  onInvoiceCreated={(newInv: Invoice) => {
                    setInvoices((prev) => [newInv, ...prev]);
                    toast.success(`Voice Intake: Added ${newInv.invoiceNumber} for ${newInv.debtorCompany || newInv.debtorName}!`);
                  }}
                  stats={{
                    totalOverdueAmount: invoices.reduce((acc, inv) => acc + (inv.amount ?? inv.amountDue ?? 0), 0),
                    recoveredAmount: 73500,
                    totalRecoveredAmount: 73500,
                    recoveryRatePercent: 78,
                    recoveryRatePercentage: 78,
                    activeChasingCount: invoices.filter((i) => i.status !== 'RECOVERED').length,
                    overdueCount: invoices.filter((i) => i.status === 'OVERDUE').length,
                  }}
                />

                <InvoiceTable
                  invoices={invoices}
                  onStartRecovery={(inv, mode) => {
                    setSimulationInvoice(inv);
                    setIsLiveCallModalOpen(true);
                  }}
                  onDirectCheckout={async (inv) => {
                    const loadingToast = toast.loading(`⚡ Generating fresh live Razorpay checkout for ${inv.invoiceNumber}...`);
                    try {
                      const res = await fetch('/api/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          invoiceId: inv.id || inv.invoiceNumber,
                          amount: inv.amountDue || inv.amount || 5000,
                          customerEmail: inv.debtorEmail || 'nishantma05@gmail.com',
                          customerName: inv.debtorName || 'Valued Client',
                        }),
                      });
                      const data = await res.json();
                      if (data?.checkoutUrl) {
                        toast.success(`Opening live Razorpay checkout portal for ${inv.invoiceNumber}!`, { id: loadingToast });
                        window.open(data.checkoutUrl, '_blank');
                        return;
                      }
                    } catch (e) {
                      console.warn('Checkout error:', e);
                    }
                    toast.dismiss(loadingToast);
                    window.open(`/pay/${inv.invoiceNumber || inv.id}`, '_blank');
                  }}
                  onAddInvoice={() => setIsUploadModalOpen(true)}
                />
              </div>
            </section>
          ) : activeNav === 'settings' ? (
            <section className="clay-card flex flex-1 flex-col overflow-y-auto p-4 md:p-6" data-lenis-prevent>
              <SettingsPanel />
            </section>
          ) : (
            <>
              {/* ── ALL-IN-ONE MAIN BOX (Combined Stage: Sine Wave + Fading Chat Stream + Controls) ── */}
              <section className="clay-card flex flex-1 flex-col overflow-hidden p-4 md:p-5">
                {/* Box Top Header: Status Badges & Network Latency Pill */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 pb-3 dark:border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'clay-pill flex items-center gap-2 px-3.5 py-1 text-xs font-black tracking-wide uppercase shadow-sm',
                        stateMeta.pillBg,
                        stateMeta.textColor
                      )}
                    >
                      <span className={cn('size-2 rounded-full', stateMeta.dotBg)} />
                      <span>{stateMeta.badgeText}</span>
                    </div>

                    {/* Connecting / Low-bandwidth Adaptive Pipeline Notice */}
                    {dashState === 'connecting' && (
                      <div className="clay-pill flex animate-pulse items-center gap-1.5 bg-sky-50 px-3 py-1 text-[11px] font-bold text-sky-900 shadow-sm dark:bg-sky-950/60 dark:text-sky-200 border border-sky-500/20">
                        <Loader2 className="size-3 animate-spin text-sky-600 dark:text-sky-400" />
                        <span>Connecting voice pipeline (Opus 48kHz)... Please wait</span>
                      </div>
                    )}
                  </div>

                  {/* Network & Latency Pill */}
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'clay-pill flex items-center gap-2 px-3 py-1 font-mono text-[11px] font-bold shadow-sm transition-all',
                        isConnected
                          ? 'border border-emerald-300/60 bg-emerald-50/90 text-emerald-950 dark:border-emerald-700/50 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-white/90 text-zinc-700 dark:bg-[#111c30] dark:text-zinc-200'
                      )}
                      title={
                        isConnected
                          ? `Live Call Active${livePing !== null ? `: ${livePing}ms` : ''}`
                          : 'Agent Online: Ready to connect'
                      }
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'size-2 rounded-full',
                            isConnected ? 'animate-pulse bg-emerald-500' : 'bg-emerald-500'
                          )}
                        />
                        <Signal
                          className={cn(
                            'size-3.5 stroke-[2.5]',
                            isConnected
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          )}
                        />
                      </div>

                      {isConnected ? (
                        <>
                          {livePing !== null && (
                            <>
                              <span className="font-mono text-xs font-black tracking-tight text-slate-900 dark:text-white">
                                {livePing}ms
                              </span>
                              <span className="text-slate-300 dark:text-slate-600">•</span>
                            </>
                          )}
                          <span className="text-[10px] font-extrabold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                            LIVE
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                          ONLINE
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── SINGLE UNIFIED STAGE (Pre-Call Centerpiece Hero OR Active Sine Wave + Chat) ── */}
                <div className="clay-inset relative my-3 flex flex-1 flex-col overflow-hidden rounded-3xl p-4">
                  {dashState === 'ready' || dashState === 'ended' ? (
                    /* ── Pre-Call / Post-Call: 3D Spline Orb ── */
                    <div
                      onClick={() => handleStartSession()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleStartSession();
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      title="Click to start voice negotiation call"
                      className="group relative flex flex-1 min-h-[360px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl bg-[#E8EEF5] transition-all hover:brightness-[1.02] focus:outline-none active:scale-[0.99] dark:border dark:border-white/[0.08] dark:bg-[#070b14] shadow-[inset_0_3px_12px_rgba(0,0,0,0.8)]"
                    >
                      <div className="pointer-events-none absolute inset-0 hidden items-center justify-center dark:flex">
                        <div className="size-80 rounded-full bg-gradient-to-tr from-cyan-500/15 via-sky-500/10 to-transparent blur-3xl" />
                      </div>
                      <spline-viewer
                        url="https://prod.spline.design/4iC321jWjBLbdcUS/scene.splinecode"
                        className="absolute inset-0 size-full cursor-pointer"
                        style={{
                          width: '100%',
                          height: '100%',
                          transform: 'scale(1.5)',
                          transformOrigin: 'center center',
                        }}
                      />
                    </div>
                  ) : (
                    /* ── Active / Ongoing Negotiation Stage (Sine Wave + Scrolling Chat) ── */
                    <>
                      {/* 1. Sine Wave Visualizer Section situated at top (30% compact ratio) */}
                      <div className="relative z-10 flex h-[100px] w-full shrink-0 items-center justify-center overflow-hidden md:h-[115px]">
                        <AgentAudioVisualizerWave
                          size="lg"
                          state={agentState ?? 'listening'}
                          color={
                            dashState === 'speaking'
                              ? '#0ea5e9' // electric sky
                              : dashState === 'listening'
                                ? '#10b981' // rich emerald
                                : dashState === 'connecting'
                                  ? '#38bdf8' // soft sky
                                  : '#06b6d4' // cyan
                          }
                          colorShift={0.3}
                          lineWidth={2.5}
                          blur={0.2}
                          audioTrack={audioTrack}
                          className="size-full"
                        />
                      </div>

                      {/* 2. Chat Stream scrolling underneath, with top gradient fade-out behind the sine wave */}
                      <div className="relative mt-1 flex flex-1 flex-col overflow-hidden">
                        {/* Smooth top fade gradient overlay so messages fade away into the sine wave backdrop */}
                        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-[#edf2f7] to-transparent dark:from-[#111114]" />

                        {/* Message Scroll Container */}
                        <div className="flex flex-1 flex-col gap-3 overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent_0%,black_16px,black_100%)] px-1 pt-4 pb-2">
                          {displayedMessages.map((m) => {
                            const isUser = m.isUser;
                            return (
                              <div
                                key={m.id}
                                className={cn(
                                  'flex max-w-[82%] items-start gap-2.5 text-xs',
                                  isUser ? 'flex-row-reverse self-end' : 'flex-row self-start'
                                )}
                              >
                                {/* Avatar / Speaker Tag */}
                                {isUser ? (
                                  <span className="clay-pill shrink-0 self-start bg-slate-200 px-2.5 py-1 font-mono text-[10px] font-black text-slate-800 shadow-sm dark:bg-zinc-800 dark:text-zinc-200">
                                    YOU
                                  </span>
                                ) : (
                                  <div
                                    title="RevClaim AI"
                                    className="clay-card-flat relative size-8 shrink-0 self-start overflow-hidden rounded-full border border-emerald-300/80 bg-[#E8EEF5] shadow-md ring-2 ring-emerald-400/30 dark:border-emerald-500/50 dark:bg-[#141418] dark:ring-emerald-500/30"
                                  >
                                    <spline-viewer
                                      url="https://prod.spline.design/4iC321jWjBLbdcUS/scene.splinecode"
                                      className="pointer-events-none absolute inset-0 size-full"
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        transform: 'scale(1.8)',
                                        transformOrigin: 'center center',
                                      }}
                                    />
                                  </div>
                                )}

                                {/* Message Bubble */}
                                <div
                                  className={cn(
                                    'clay-card-flat rounded-2xl px-4 py-2.5 leading-relaxed shadow-sm transition-all',
                                    isUser
                                      ? 'border border-slate-300/70 bg-white/95 text-slate-900 dark:border-white/10 dark:bg-[#1f1f25] dark:text-zinc-100'
                                      : 'border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 to-teal-50/90 text-slate-900 shadow-emerald-100/50 dark:border-emerald-900/60 dark:bg-gradient-to-r dark:from-[#16211d] dark:to-[#1b2521] dark:text-zinc-100 dark:shadow-none'
                                  )}
                                >
                                  <p className="whitespace-pre-wrap">{m.message}</p>

                                  {/* Interactive Razorpay Card */}
                                  {!isUser && (m.paymentLinkUrl || m.message.toLowerCase().includes('razorpay') || m.message.toLowerCase().includes('payment link') || m.message.toLowerCase().includes('secure link')) && (
                                    <div className="mt-3 overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/95 via-teal-950/90 to-slate-950/95 p-4 text-white shadow-xl backdrop-blur-md">
                                      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                                        <div className="flex items-center gap-2">
                                          <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40">
                                            <CreditCard className="size-4" />
                                          </div>
                                          <div>
                                            <span className="block text-[11px] font-black uppercase tracking-wider text-emerald-300">
                                              Razorpay • Instant Settlement Rail
                                            </span>
                                            <span className="text-[10px] text-slate-300">
                                              Invoice {m.invoiceNumber || 'INV-1042'} • UPI &amp; Cards Verified
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-[10px] font-bold uppercase text-slate-400">Total Due</span>
                                          <div className="font-mono text-base font-black text-emerald-400">
                                            ₹{(m.amount || 45000).toLocaleString('en-IN')}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <a
                                          href={m.paymentLinkUrl || 'https://rzp.io/i/demo_pay'}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-500/20 transition-all hover:brightness-110 active:scale-95"
                                        >
                                          <CreditCard className="size-3.5" />
                                          <span>Settle Now via Razorpay</span>
                                          <ExternalLink className="size-3" />
                                        </a>
                                        <a
                                          href={`https://wa.me/918840301998?text=${encodeURIComponent(`Namaste Rahul ji, here is your verified Razorpay settlement link for invoice ${m.invoiceNumber || 'INV-1042'}: ${m.paymentLinkUrl || 'https://rzp.io/i/demo_pay'}`)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-900/40 px-3.5 py-2.5 text-xs font-bold text-emerald-200 transition-all hover:bg-emerald-800/40 active:scale-95"
                                        >
                                          <MessageCircle className="size-3.5 text-emerald-400" />
                                          <span>WhatsApp</span>
                                        </a>
                                      </div>

                                      <div className="mt-2.5 flex items-center justify-between border-t border-emerald-500/10 pt-2 text-[10px] text-emerald-300/80">
                                        <span className="flex items-center gap-1">
                                          <CheckCircle2 className="size-3 text-emerald-400" />
                                          Dispatched to nishantma05@gmail.com & WhatsApp
                                        </span>
                                        <span className="font-mono text-slate-400">Instant UPI • Cards • NetBanking</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* 3. Bottom Section: Integrated LiveKit Control Bar with Chat Input */}
                <div className="mt-2 flex shrink-0 flex-col gap-2">
                  {/* ── Live Facility Push Card (Day 5 LiveKit Data Event) ───────────── */}
                  <AnimatePresence>
                    {activeFacility && (
                      <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className="clay-card relative overflow-hidden border border-emerald-300/80 bg-gradient-to-r from-emerald-50/95 via-teal-50/95 to-cyan-50/95 p-3.5 shadow-lg shadow-emerald-500/10 dark:border-emerald-700/60 dark:bg-gradient-to-r dark:from-[#16211d] dark:via-[#192420] dark:to-[#141d1a] dark:shadow-none"
                      >
                        {/* Top Header: Badge + Close */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                              <Building2 className="size-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                                {activeFacility.name}
                              </h4>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                <span className="clay-pill bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-800 uppercase dark:bg-emerald-900/80 dark:text-emerald-200">
                                  {activeFacility.facility_type}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                  <Clock className="size-3 text-emerald-600" />
                                  {activeFacility.opd_timings}
                                </span>
                                {activeFacility.emergency_24x7 && (
                                  <span className="clay-pill bg-rose-100 px-2 py-0.5 text-[9px] font-black text-rose-800 uppercase dark:bg-rose-900/80 dark:text-rose-200">
                                    24x7 Emergency
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => setActiveFacility(null)}
                            className="clay-btn flex size-6 shrink-0 items-center justify-center rounded-lg p-0 text-slate-500 hover:text-slate-800"
                            title="Dismiss card"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>

                        {/* Address & Free Services */}
                        <div className="mt-2.5 grid grid-cols-1 gap-2 text-[11px] md:grid-cols-2">
                          <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                            <MapPin className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                            <span className="line-clamp-2">{activeFacility.address}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1">
                            <HeartPulse className="size-3.5 shrink-0 text-teal-600" />
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              Free Services:
                            </span>
                            {activeFacility.free_services.slice(0, 2).map((srv, idx) => (
                              <span
                                key={idx}
                                className="clay-pill bg-white/80 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              >
                                {srv}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Live Map Embed */}
                        <AnimatePresence>
                          {showFacilityMap && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 170 }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                              className="relative mt-2.5 overflow-hidden rounded-xl border border-emerald-300/80 bg-slate-100 shadow-inner dark:border-emerald-700/60 dark:bg-slate-900"
                            >
                              <iframe
                                title="Facility Live Location Map"
                                width="100%"
                                height="170"
                                loading="lazy"
                                className="border-0 filter dark:contrast-90 dark:hue-rotate-180 dark:invert-[0.88]"
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                                  `${activeFacility.name}, ${activeFacility.address}`
                                )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Footer Action Links */}
                        <div className="mt-3 flex items-center justify-between border-t border-emerald-200/60 pt-2 text-[10px] dark:border-emerald-800/40">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-500 dark:text-slate-400">
                              Verified: {facilityTimestamp}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowFacilityMap(!showFacilityMap)}
                              className="clay-pill flex items-center gap-1 bg-white/80 px-2 py-0.5 font-bold text-emerald-800 hover:bg-emerald-100 dark:bg-slate-800 dark:text-emerald-300"
                              title="Toggle Map View"
                            >
                              <MapIcon className="size-3" />
                              <span>{showFacilityMap ? 'HIDE MAP' : 'SHOW MAP'}</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(
                                `${activeFacility.name} ${activeFacility.address}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="clay-btn flex items-center gap-1 bg-white/90 px-2.5 py-1 font-bold text-emerald-800 hover:text-emerald-950 dark:bg-slate-800 dark:text-emerald-300"
                            >
                              <Navigation className="size-3" />
                              <span>DIRECTIONS</span>
                            </a>
                            <a
                              href="tel:108"
                              className="clay-btn-primary flex items-center gap-1 px-3 py-1 font-bold text-white"
                            >
                              <Phone className="size-3 stroke-[2.5]" />
                              <span>CALL 108</span>
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Quick Prompt Suggestion Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="mr-1 flex items-center gap-1 text-[10px] font-bold text-slate-500">
                      <Sparkles className="size-3 text-sky-500" />
                      <span>{t('suggestPrefix')}</span>
                    </div>
                    {(QUICK_SUGGESTIONS[selectedLang] || QUICK_SUGGESTIONS.en).map((chip: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(chip)}
                        className="clay-pill bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 transition-all hover:bg-sky-50 hover:text-sky-900 active:scale-95 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Input and Controls Row */}
                  <div className="flex items-center gap-2">
                    {/* Gnani Prisma Indic Mic Button */}
                    <button
                      onClick={togglePrismaMic}
                      className={cn(
                        'clay-btn flex size-10 shrink-0 items-center justify-center rounded-2xl transition-all',
                        isPrismaListening
                          ? 'clay-btn-danger text-white animate-pulse ring-2 ring-rose-400'
                          : 'text-slate-700 hover:text-slate-950 dark:text-zinc-200'
                      )}
                      title={isPrismaListening ? 'Gnani Prisma Mic Listening: Speak now (Click to stop)' : 'Click to speak with Gnani Prisma Indic Mic'}
                    >
                      <Mic className={cn('size-4 stroke-[2.5]', isPrismaListening && 'animate-spin')} />
                    </button>

                    {/* Text Chat Input Field */}
                    <div className="clay-card-flat flex flex-1 items-center px-3.5 py-1.5">
                      <input
                        id="negotiation-chat-input"
                        name="chatInput"
                        aria-label="Payment negotiation input"
                        type="text"
                        value={chatInputText}
                        onChange={(e) => setChatInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('chatInputPlaceholder')}
                        className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                    </div>

                    {/* Send Button */}
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!chatInputText.trim() || isSendingChat}
                      className="clay-btn-primary flex size-10 shrink-0 items-center justify-center rounded-2xl disabled:scale-100 disabled:opacity-40"
                      title="Send message"
                    >
                      {isSendingChat ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <SendHorizontal className="size-4 stroke-[2.5]" />
                      )}
                    </button>

                    {/* Start / End Call Button */}
                    {!isAutonomousActive && !isConnected ? (
                      <button
                        onClick={handleStartSession}
                        className="clay-btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase shadow-md transition-transform hover:scale-105 active:scale-95"
                        title={dashState === 'ended' ? 'Resume voice negotiation' : 'Start voice negotiation'}
                      >
                        <Phone className="size-3.5 stroke-[2.5]" />
                        <span className="hidden sm:inline">START</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleEndSession}
                        className="clay-btn-danger flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase shadow-md transition-transform hover:scale-105 active:scale-95"
                        title="End current call"
                      >
                        <PhoneOff className="size-3.5 stroke-[2.5]" />
                        <span className="hidden sm:inline">END</span>
                      </button>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      {/* Autonomous Voice Call Simulation Modal */}
      <LiveCallModal
        invoice={simulationInvoice}
        isOpen={isLiveCallModalOpen}
        onClose={() => setIsLiveCallModalOpen(false)}
        onCallCompleted={(invoiceId, recovered) => {
          if (recovered) {
            setInvoices((prev) =>
              prev.map((i) =>
                i.id === invoiceId ? { ...i, status: 'RECOVERED' } : i
              )
            );
          }
        }}
      />

      {/* Invoice Creation / Import Modal */}
      <InvoiceUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onInvoiceCreated={(newInv) => {
          setInvoices((prev) => [newInv, ...prev]);
        }}
      />

      {/* Auth Modal with Demo Mode for Judges & OAuth */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onDemoLogin={handleDemoLogin}
      />

      {/* Sovereign Hybrid Graph RAG & Corporate Veil Explorer Modal */}
      <HybridGraphRagModal
        isOpen={isGraphRagModalOpen}
        onClose={() => setIsGraphRagModalOpen(false)}
      />
    </div>
  </LenisProvider>
  );
}
