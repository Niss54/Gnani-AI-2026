"use client";

import React, { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import { AuthModal } from "./AuthModal";
import { LogIn, LogOut, User } from "lucide-react";

export function AuthButton() {
  const [user, setUser] = useState<{ email?: string; name?: string; avatar?: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
          avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
          avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
    }
  };

  return (
    <>
      {user ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-[#202026] border border-zinc-200 dark:border-white/10 text-xs text-zinc-800 dark:text-zinc-200 shadow-xs">
            {user.avatar ? (
              <img src={user.avatar} alt="avatar" className="w-4 h-4 rounded-full" />
            ) : (
              <User className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span className="font-mono text-[11px] truncate max-w-[120px]">{user.name || user.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsModalOpen(true)}
          className="clay-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition active:scale-95"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </button>
      )}

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
