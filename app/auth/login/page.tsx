'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AuthShell from '@/components/AuthShell';
import GoogleButton from '@/components/GoogleButton';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Якщо сесія вже є, одразу в додаток
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/chats');
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || loading) return;

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.replace('/chats');
  };

  const inputClass =
    'w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-3 font-inter font-medium text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-green-500';

  return (
    <AuthShell title="Welcome back" subtitle="Log in to find your squad">
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={inputClass}
          />
        </div>

        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={inputClass}
          />
        </div>

        {error && (
          <p className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 font-inter text-sm font-medium text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!email.trim() || !password || loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3.5 font-inter font-bold text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
          Login
        </button>
      </form>

      <GoogleButton onError={setError} />

      <p className="mt-6 text-center font-inter text-sm font-medium text-zinc-500">
        Don&apos;t have an account?{' '}
        <Link href="/auth/register" className="font-bold text-green-500 hover:text-green-400">
          Register
        </Link>
      </p>
    </AuthShell>
  );
}
