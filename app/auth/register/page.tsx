'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, UserPlus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AuthShell from '@/components/AuthShell';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmSent, setConfirmSent] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const name = username.trim();
    if (name.length < 3) {
      setError('Nickname must be at least 3 characters');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { username: name },
        emailRedirectTo: `${window.location.origin}/auth/login`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Якщо підтвердження пошти вимкнене, сесія є одразу
    if (data.session) {
      router.replace('/');
    } else {
      setConfirmSent(true);
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-3 font-inter font-medium text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-green-500';

  if (confirmSent) {
    return (
      <AuthShell title="Check your email">
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <p className="font-inter font-medium text-zinc-400">
            We sent a confirmation link to <span className="text-white">{email.trim()}</span>.
            Confirm your email, then log in.
          </p>
          <Link
            href="/auth/login"
            className="mt-2 w-full rounded-xl bg-green-500 py-3.5 text-center font-inter font-bold text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-colors hover:bg-green-400"
          >
            Go to Login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create account" subtitle="Join Muster and find your squad">
      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={24}
            autoComplete="username"
            placeholder="Nickname"
            className={inputClass}
          />
        </div>

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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min. 6 characters)"
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
          disabled={!username.trim() || !email.trim() || !password || loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3.5 font-inter font-bold text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
          Register
        </button>
      </form>

      <p className="mt-6 text-center font-inter text-sm font-medium text-zinc-500">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-bold text-green-500 hover:text-green-400">
          Login
        </Link>
      </p>
    </AuthShell>
  );
        }
