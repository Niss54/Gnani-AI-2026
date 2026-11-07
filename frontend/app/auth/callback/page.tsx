'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Verifying Supabase authentication...');

  useEffect(() => {
    async function handleAuth() {
      try {
        const sb = getSupabase();
        if (!sb) {
          router.replace('/');
          return;
        }

        // If a PKCE code exists in the URL search params, exchange it
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          setStatus('Exchanging authorization token with Supabase...');
          const { error } = await sb.auth.exchangeCodeForSession(code);
          if (error) {
            console.warn('[Supabase Auth Callback] Exchange error:', error.message);
          }
        }

        // Get the verified session
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) {
          localStorage.setItem('revclaim_logged_in', 'true');
        }

        setStatus('Redirecting to Delinquent Cockpit...');
        setTimeout(() => {
          router.replace('/');
        }, 300);
      } catch (err) {
        console.error('[Supabase Auth Callback] Exception:', err);
        router.replace('/');
      }
    }

    handleAuth();
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0c101d] text-white">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
        <div className="size-14 rounded-2xl overflow-hidden shadow-xl ring-2 ring-indigo-500/30 bg-white dark:bg-zinc-800 p-1">
          <img src="/logo2.png" alt="RevClaim AI" className="size-full object-cover rounded-xl" />
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-black tracking-wider uppercase text-slate-300">
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}
