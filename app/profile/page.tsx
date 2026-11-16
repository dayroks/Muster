'use client';

import { useEffect, useState } from 'react';
import {
  User,
  Pencil,
  ArrowLeft,
  Save,
  X,
  Send,
  Youtube,
  Instagram,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

const USER_ID_KEY = 'muster_user_id';
const PROFILE_KEY = 'muster_profile';
const OLD_USERNAME_KEY = 'muster_username';

type ProfileData = {
  username: string;
  bio: string;
  telegram: string;
  youtube: string;
  instagram: string;
};

const EMPTY: ProfileData = {
  username: '',
  bio: '',
  telegram: '',
  youtube: '',
  instagram: '',
};

type Toast = { type: 'success' | 'error'; text: string } | null;

function normalizeLink(kind: 'telegram' | 'youtube' | 'instagram', raw: string) {
  const v = raw.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (kind === 'telegram') {
    if (v.startsWith('t.me/')) return `https://${v}`;
    return `https://t.me/${v.replace(/^@/, '')}`;
  }
  if (kind === 'youtube') {
    if (v.startsWith('@')) return `https://youtube.com/${v}`;
    return `https://${v}`;
  }
  if (v.startsWith('@')) return `https://instagram.com/${v.slice(1)}`;
  return `https://${v}`;
}

export default function ProfilePage() {
  const [userId, setUserId] = useState('');
  const [profile, setProfile] = useState<ProfileData>(EMPTY);
  const [draft, setDraft] = useState<ProfileData>(EMPTY);
  const [isEditing, setIsEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  // Завантаження: спочатку localStorage, потім підтягуємо дані з Supabase
  useEffect(() => {
    const init = async () => {
      let id = '';
      let local: ProfileData = EMPTY;
      try {
        id = localStorage.getItem(USER_ID_KEY) ?? '';
        if (!id) {
          id = crypto.randomUUID();
          localStorage.setItem(USER_ID_KEY, id);
        }
        const saved = localStorage.getItem(PROFILE_KEY);
        if (saved) {
          local = { ...EMPTY, ...JSON.parse(saved) };
        } else {
          // міграція зі старого формату (тільки нікнейм)
          local = { ...EMPTY, username: localStorage.getItem(OLD_USERNAME_KEY) ?? '' };
        }
      } catch (e) {
        console.error('localStorage error:', e);
      }

      setUserId(id);
      setProfile(local);
      setLoaded(true);

      if (id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, bio, telegram, youtube, instagram')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          console.error('Supabase load error:', error.message);
        } else if (data) {
          const remote: ProfileData = {
            username: data.username ?? '',
            bio: data.bio ?? '',
            telegram: data.telegram ?? '',
            youtube: data.youtube ?? '',
            instagram: data.instagram ?? '',
          };
          setProfile(remote);
          try {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(remote));
          } catch {}
        }
      }
    };
    init();
  }, []);

  // Автоматично ховаємо повідомлення
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const startEditing = () => {
    setDraft(profile);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const next: ProfileData = {
      username: draft.username.trim(),
      bio: draft.bio.trim(),
      telegram: draft.telegram.trim(),
      youtube: draft.youtube.trim(),
      instagram: draft.instagram.trim(),
    };
    if (!next.username || saving) return;

    setSaving(true);

    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error('localStorage error:', e);
    }
    setProfile(next);

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...next }, { onConflict: 'id' });

    setSaving(false);
    setIsEditing(false);

    if (error) {
      console.error('Supabase upsert error:', error.message);
      setToast({ type: 'error', text: 'Saved on this device, sync failed' });
    } else {
      setToast({ type: 'success', text: 'Profile saved!' });
    }
  };

  const hasProfile = profile.username.length > 0;
  const handle = profile.username.toLowerCase().replace(/\s+/g, '');

  const contacts = [
    {
      key: 'telegram' as const,
      label: 'Telegram',
      Icon: Send,
      color: 'text-sky-400',
      href: normalizeLink('telegram', profile.telegram),
    },
    {
      key: 'youtube' as const,
      label: 'YouTube',
      Icon: Youtube,
      color: 'text-red-500',
      href: normalizeLink('youtube', profile.youtube),
    },
    {
      key: 'instagram' as const,
      label: 'Instagram',
      Icon: Instagram,
      color: 'text-pink-500',
      href: normalizeLink('instagram', profile.instagram),
    },
  ];

  const inputClass =
    'w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 px-3 font-inter font-medium text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-green-500';
  const labelClass = 'font-inter text-sm font-medium text-zinc-400';

  return (
    <div className="min-h-screen bg-zinc-950">
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

      <main className="mx-auto max-w-md pb-28">
        {!loaded ? null : isEditing ? (
          /* ---------- РЕЖИМ РЕДАГУВАННЯ ---------- */
          <div className="flex flex-col gap-5 px-4 pt-8">
            <h2 className="font-onest text-3xl font-extrabold tracking-tight text-white">
              Edit Profile
            </h2>

            <div className="flex flex-col gap-2">
              <label htmlFor="username" className={labelClass}>
                Nickname
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <input
                  id="username"
                  value={draft.username}
                  onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                  maxLength={24}
                  placeholder="Enter your nickname"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="bio" className={labelClass}>
                About me
              </label>
              <textarea
                id="bio"
                value={draft.bio}
                onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                maxLength={160}
                rows={3}
                placeholder="Tell something about yourself"
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="telegram" className={labelClass}>
                Telegram
              </label>
              <input
                id="telegram"
                value={draft.telegram}
                onChange={(e) => setDraft({ ...draft, telegram: e.target.value })}
                placeholder="@username or t.me/username"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="youtube" className={labelClass}>
                YouTube
              </label>
              <input
                id="youtube"
                value={draft.youtube}
                onChange={(e) => setDraft({ ...draft, youtube: e.target.value })}
                placeholder="youtube.com/@channel"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="instagram" className={labelClass}>
                Instagram
              </label>
              <input
                id="instagram"
                value={draft.instagram}
                onChange={(e) => setDraft({ ...draft, instagram: e.target.value })}
                placeholder="@username or instagram.com/username"
                className={inputClass}
              />
            </div>

            <div className="mt-2 flex flex-col gap-3">
              <button
                onClick={handleSave}
                disabled={!draft.username.trim() || saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3.5 font-inter font-bold text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                <Save className="h-5 w-5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 py-3.5 font-inter font-bold text-zinc-300 transition-all hover:border-zinc-700 hover:text-white"
              >
                <X className="h-5 w-5" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ---------- РЕЖИМ ПЕРЕГЛЯДУ ---------- */
          <div>
            {/* Банер */}
            <div className="h-32 w-full bg-gradient-to-r from-zinc-800 to-zinc-900" />

            <div className="px-6">
              {/* Аватарка: рівно наполовину на банері, по центру */}
              <div className="relative mx-auto -mt-16 flex h-32 w-32 items-center justify-center rounded-full border-4 border-green-500 bg-zinc-900 shadow-[0_0_25px_rgba(34,197,94,0.25)]">
                {hasProfile ? (
                  <span className="font-onest text-5xl font-extrabold text-white">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="h-14 w-14 text-zinc-500" />
                )}
              </div>

              {/* Ім'я */}
              <h2 className="mt-4 text-center font-onest text-3xl font-extrabold tracking-tight text-white">
                {hasProfile ? profile.username : 'No profile yet'}
              </h2>

              {hasProfile && (
                <>
                  {/* About me: текст, під ним сірий підпис */}
                  <div className="mt-8">
                    <p className="font-inter text-lg font-medium text-white">
                      {profile.bio || 'Nothing here yet'}
                    </p>
                    <p className="font-inter text-sm font-bold text-zinc-500">about me</p>
                  </div>

                  {/* Username */}
                  <div className="mt-5">
                    <p className="font-inter text-lg font-medium text-white">@{handle}</p>
                    <p className="font-inter text-sm font-bold text-zinc-500">username</p>
                  </div>

                  {/* Contacts */}
                  <h3 className="mt-8 text-center font-inter text-xl font-bold text-zinc-300">
                    Contacts
                  </h3>
                  <div className="mt-4 flex flex-col items-center gap-3">
                    {contacts.map(({ key, label, Icon, color, href }) => {
                      const pillClass =
                        'flex w-3/4 items-center justify-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 py-2.5 font-inter font-bold text-white transition-all';
                      const content = (
                        <>
                          <Icon className={`h-5 w-5 ${color}`} />
                          {label}
                        </>
                      );
                      return href ? (
                        <a
                          key={key}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${pillClass} hover:border-zinc-700`}
                        >
                          {content}
                        </a>
                      ) : (
                        <div key={key} className={`${pillClass} opacity-40`}>
                          {content}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Edit */}
              <button
                onClick={startEditing}
                className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3.5 font-inter font-bold text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-colors hover:bg-green-400"
              >
                <Pencil className="h-5 w-5" />
                {hasProfile ? 'Edit Profile' : 'Create Profile'}
              </button>

              {/* ID (потрібен для чатів) */}
              <p className="mt-4 break-all text-center font-inter text-xs font-medium text-zinc-600">
                ID: {userId}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Повідомлення */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl border bg-zinc-900 px-4 py-3 font-inter font-bold ${
            toast.type === 'success'
              ? 'border-green-500/30 text-green-400'
              : 'border-red-500/30 text-red-400'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {toast.text}
        </div>
      )}

      <BottomNav />
    </div>
  );
      }
