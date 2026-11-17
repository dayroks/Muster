
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  Mail,
  Loader2,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/lib/useRequireAuth';
import PageShell from '@/components/PageShell';
import FullScreenLoader from '@/components/FullScreenLoader';

export default function SettingsPage() {
  const router = useRouter();
  const { user, checking } = useRequireAuth();

  const [loggingOut, setLoggingOut] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    if (checking) return;

    if (!user) {
      setLoadingRole(false);
      return;
    }

    let active = true;

    const loadRole = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!active) return;

      if (error) {
        console.error('Role loading error:', error);
        setRole(null);
      } else {
        setRole(data?.role ?? 'user');
      }

      setLoadingRole(false);
    };

    loadRole();

    return () => {
      active = false;
    };
  }, [user, checking]);

  const handleLogout = async () => {
    setLoggingOut(true);

    await supabase.auth.signOut();
    router.replace('/auth/login');
  };

  if (checking || loadingRole) return <FullScreenLoader />;

  return (
    <PageShell>
      <h2 className="mb-4 font-onest text-2xl font-extrabold tracking-tight text-white">
        Settings
      </h2>

      <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <Mail className="h-5 w-5 shrink-0 text-zinc-400" />

        <div className="min-w-0">
          <p className="truncate font-inter text-sm font-medium text-white">
            {user?.email}
          </p>
          <p className="font-inter text-xs font-bold text-zinc-500">
            account email
          </p>
        </div>
      </div>

      {/* Admin Dashboard - only for admins */}
      {role === 'admin' && (
        <button
          onClick={() => router.push('/admin')}
          className="mt-4 flex w-full items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-left transition-all hover:border-green-500/60 hover:bg-green-500/15"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-500/15">
            <ShieldCheck className="h-6 w-6 text-green-400" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-inter text-sm font-bold text-white">
              Admin Dashboard
            </p>
            <p className="font-inter text-xs text-zinc-500">
              Manage game requests and games
            </p>
          </div>

          <ChevronRight className="h-5 w-5 shrink-0 text-green-400" />
        </button>
      )}

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-3.5 font-inter font-bold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
      >
        {loggingOut ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <LogOut className="h-5 w-5" />
        )}
        Log out
      </button>
    </PageShell>
  );
}
