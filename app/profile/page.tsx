'use client';

import { useEffect, useState } from 'react';
import { User, Pencil, ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

const USER_ID_KEY = 'muster_user_id';
const USERNAME_KEY = 'muster_username';

export default function ProfilePage() {
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [draft, setDraft] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Завантаження з localStorage (лише на клієнті)
  useEffect(() => {
    try {
      let id = localStorage.getItem(USER_ID_KEY);
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(USER_ID_KEY, id);
      }
      setUserId(id);
      setUsername(localStorage.getItem(USERNAME_KEY) ?? '');
    } catch (e) {
      console.error('localStorage error:', e);
    }
    setLoaded(true);
  }, []);

  // Автоматично ховаємо повідомлення про успіх
  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => setShowSuccess(false), 2500);
    return () => clearTimeout(t);
  }, [showSuccess]);

  const startEditing = () => {
    setDraft(username);
    setIsEditing(true);
  };

  const handleSave = () => {
    const name = draft.trim();
    if (!name) return;
    try {
      localStorage.setItem(USERNAME_KEY, name);
    } catch (e) {
      console.error('localStorage error:', e);
    }
    setUsername(name);
    setIsEditing(false);
    setShowSuccess(true);
  };

  const hasProfile = username.length > 0;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Хедер: логотип у режимі перегляду, "Back" у режимі редагування */}
      {isEditing ? (
        <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-md items-center px-4 py-4">
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 font-inter font-bold text-zinc-300 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </button>
          </div>
        </header>
      ) : (
        <Header />
      )}

      <main className="mx-auto max-w-md px-4 pb-28 pt-8">
        {!loaded ? null : isEditing ? (
          /* ---------- РЕЖИМ РЕДАГУВАННЯ ---------- */
          <div className="flex flex-col gap-6">
            <h2 className="font-onest text-3xl font-extrabold tracking-tight text-white">
              Edit Profile
            </h2>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="username"
                className="font-inter text-sm font-medium text-zinc-400"
              >
                Nickname
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <input
                  id="username"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  maxLength={24}
                  autoFocus
                  placeholder="Enter your nickname"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-3 font-inter font-medium text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-green-500"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!draft.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3.5 font-inter font-bold text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              <Save className="h-5 w-5" />
              Save Changes
            </button>
          </div>
        ) : (
          /* ---------- РЕЖИМ ПЕРЕГЛЯДУ ---------- */
          <div className="flex flex-col items-center gap-4 text-center">
            {/* Аватарка */}
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-green-500 bg-zinc-900 shadow-[0_0_25px_rgba(34,197,94,0.25)]">
              {hasProfile ? (
                <span className="font-onest text-5xl font-extrabold text-white">
                  {username.charAt(0).toUpperCase()}
                </span>
              ) : (
                <User className="h-14 w-14 text-zinc-500" />
              )}
            </div>

            {/* Нікнейм */}
            <h2 className="font-onest text-3xl font-extrabold tracking-tight text-white">
              {hasProfile ? username : 'No profile yet'}
            </h2>

            {/* ID */}
            <p className="break-all font-inter text-xs font-medium text-zinc-500">
              ID: {userId}
            </p>

            {/* Кнопка */}
            <button
              onClick={startEditing}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3.5 font-inter font-bold text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-colors hover:bg-green-400"
            >
              <Pencil className="h-5 w-5" />
              {hasProfile ? 'Edit Profile' : 'Create Profile'}
            </button>
          </div>
        )}
      </main>

      {/* Повідомлення про успіх */}
      {showSuccess && (
        <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-green-500/30 bg-zinc-900 px-4 py-3 font-inter font-bold text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
          <CheckCircle2 className="h-5 w-5" />
          Profile saved!
        </div>
      )}

      <BottomNav />
    </div>
  );
}
