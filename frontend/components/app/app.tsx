'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { TokenSource } from 'livekit-client';
import { TriangleAlert } from 'lucide-react';
import { useSession } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { StartAudioButton } from '@/components/agents-ui/start-audio-button';
import { Toaster } from '@/components/ui/sonner';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';

const SamarDashboard = dynamic(
  () => import('@/components/app/samar-dashboard').then((m) => m.SamarDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-svh items-center justify-center bg-[#edf2f7] dark:bg-[#111113]">
        <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
          <div className="size-12 rounded-2xl overflow-hidden shadow-md ring-2 ring-indigo-500/20 bg-white dark:bg-zinc-800 p-1">
            <img src="/logo2.png" alt="RevClaim AI" className="size-full object-cover rounded-xl" />
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Initializing RevClaim Autonomous Desk...
            </span>
          </div>
        </div>
      </div>
    ),
  }
);

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();

  return null;
}

interface AppProps {
  appConfig: AppConfig;
}

export function App({ appConfig }: AppProps) {
  const tokenSource = useMemo(() => {
    return TokenSource.endpoint('/api/token');
  }, []);

  const session = useSession(
    tokenSource,
    appConfig.agentName ? { agentName: appConfig.agentName } : undefined
  );

  return (
    <AgentSessionProvider session={session}>
      <AppSetup />
      <main className="h-svh">
        <SamarDashboard />
      </main>
      <StartAudioButton label="Start Audio" />
      <Toaster
        icons={{
          warning: <TriangleAlert className="size-4" />,
        }}
        position="top-center"
        className="toaster group"
        style={
          {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
          } as React.CSSProperties
        }
      />
    </AgentSessionProvider>
  );
}
