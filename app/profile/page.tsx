'use client';

import { StickerCreatorBadge, StickerCreatorNote } from '@/components/StickerCreatorBadge';
import { MiniAppCreatorBadge, MiniAppCreatorNote } from '@/components/MiniAppCreatorBadge';
import { useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import Link from 'next/link';
import {
  User,
  AtSign,
  Pencil,
  ArrowLeft,
  Save,
  X,
  Send,
  Youtube,
  Instagram,
  Info,
  Settings,
  Share2,
  Camera,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/lib/useRequireAuth';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import FullScreenLoader from '@/components/FullScreenLoader';
import MentionText from '@/components/MentionText';

const BUCKET = 'avatars';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const HANDLE_RE = /^[a-z0-9_]{4,20}$/;

type ProfileData = {
  username: string;
  handle: string;
  bio: string;
  telegram: string;
  youtube: string;
  instagram: string;
  avatarUrl: string;
  bannerUrl: string;
  is_verified: boolean;
  is_sticker_creator: boolean;
  is_mini_app_creator: boolean;
};

const EMPTY: ProfileData = {
  username: '',
  handle: '',
  bio: '',
  telegram: '',
  youtube: '',
  instagram: '',
  avatarUrl: '',
  bannerUrl: '',
  is_verified: false,
  is_sticker_creator: false,
  is_mini_app_creator: false,
};

type Toast = { type: 'success' | 'error'; text: string } | null;
type ImageKind = 'avatar' | 'banner';

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

function Banner({ url }: { url: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Banner" className="h-32 w-full object-cover" />
  ) : (
    <div className="h-32 w-full bg-gradient-to-r from-zinc-800 to-zinc-900" />
  );
}

function AvatarCircle({ url, name }: { url: string; name: string }) {
  return (
    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-zinc-950 bg-zinc-900">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Avatar" className="h-full w-full object-cover" />
      ) : name ? (
        <span className="font-onest text-4xl font-extrabold text-white">
          {name.charAt(0).toUpperCase()}
        </span>
      ) : (
        <User className="h-10 w-10 text-zinc-500" />
      )}
    </div>
  );
}

function InfoRow({
  Icon,
  color,
  label,
  value,
  href,
  renderMentions = false,
}: {
  Icon: ComponentType<{ className?: string }>;
  color: string;
  label: string;
  value: string;
  href?: string;
  renderMentions?: boolean;
}) {
  const content = (
    <>
      <Icon className={`h-5 w-5 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <p className="break-words font-inter text-sm font-medium text-white">{renderMentions ? <MentionText text={value} /> : value}</p>
        <p className="font-inter text-xs font-bold text-zinc-500">{label}</p>
      </div>
    </>
  );

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 transition-opacity hover:opacity-80"
    >
      {content}
    </a>
  ) : (
    <div className="flex items-center gap-3">{content}</div>
  );
}

export default function ProfilePage() {
  const { user, checking } = useRequireAuth();

  const [profile, setProfile] = useState<ProfileData>(EMPTY);
  const [draft, setDraft] = useState<ProfileData>(EMPTY);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<ImageKind | null>(null);
  const [handleError, setHandleError] = useState('');
  const [toast, setToast] = useState<Toast>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('profiles')
      .select('username, handle, bio, telegram, youtube, instagram, avatar_url, banner_url, is_verified, is_sticker_creator, is_mini_app_creator')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('Supabase load error:', error.message);
          setToast({ type: 'error', text: 'Could not load profile' });
        } else if (data) {
          setProfile({
            username: data.username ?? '',
            handle: data.handle ?? '',
            bio: data.bio ?? '',
            telegram: data.telegram ?? '',
            youtube: data.youtube ?? '',
            instagram: data.instagram ?? '',
            avatarUrl: data.avatar_url ?? '',
            bannerUrl: data.banner_url ?? '',
            is_verified: data.is_verified === true,
            is_sticker_creator: data.is_sticker_creator === true,
            is_mini_app_creator: data.is_mini_app_creator === true,
          });
        }
        setLoadingProfile(false);
      });
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const startEditing = () => {
    setDraft(profile);
    setHandleError('');
    setIsEditing(true);
  };

  const handleFile = async (kind: ImageKind, file: File | undefined) => {
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setToast({ type: 'error', text: 'Please choose an image file' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setToast({ type: 'error', text: 'Image is too large (max 5 MB)' });
      return;
    }

    setUploading(kind);

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/${kind}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });

    if (error) {
      console.error('Upload error:', error.message);
      setToast({ type: 'error', text: 'Upload failed' });
      setUploading(null);
      return;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const key = kind === 'avatar' ? 'avatarUrl' : 'bannerUrl';
    setDraft((d) => ({ ...d, [key]: data.publicUrl }));
    setUploading(null);
  };

  const handleSave = async () => {
    if (!user || saving || uploading) return;

    const next: ProfileData = {
      username: draft.username.trim(),
      handle: draft.handle.trim().replace(/^@+/, '').toLowerCase(),
      bio: draft.bio.trim(),
      telegram: draft.telegram.trim(),
      youtube: draft.youtube.trim(),
      instagram: draft.instagram.trim(),
      avatarUrl: draft.avatarUrl,
      bannerUrl: draft.bannerUrl,
      is_verified: profile.is_verified,
      is_sticker_creator: profile.is_sticker_creator,
      is_mini_app_creator: profile.is_mini_app_creator,
    };
    if (!next.username) return;

    if (next.handle) {
      if (next.handle.length < 4) {
        setHandleError('Username must be at least 4 characters');
        return;
      }
      if (next.handle.length > 20) {
        setHandleError('Username must be 20 characters or less');
        return;
      }
      if (!HANDLE_RE.test(next.handle)) {
        setHandleError('Use only letters, numbers and underscores');
        return;
      }
    }
    setHandleError('');
    setSaving(true);

    if (next.handle && next.handle !== profile.handle) {
      const { data: taken, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('handle', next.handle)
        .neq('id', user.id)
        .limit(1);

      if (checkError) {
        console.error('Username check error:', checkError.message);
        setToast({ type: 'error', text: 'Could not check username' });
        setSaving(false);
        return;
      }
      if (taken && taken.length > 0) {
        setHandleError('This username is already taken');
        setSaving(false);
        return;
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        username: next.username,
        handle: next.handle || null,
        bio: next.bio,
        telegram: next.telegram,
        youtube: next.youtube,
        instagram: next.instagram,
        avatar_url: next.avatarUrl || null,
        banner_url: next.bannerUrl || null,
      })
      .eq('id', user.id)
      .select('id');

    setSaving(false);

    if (error) {
      console.error('Supabase update error:', error.message);
      if (error.code === '23505') {
        if (error.message.includes('handle')) {
          setHandleError('This username is already taken');
        } else {
          setToast({ type: 'error', text: 'This nickname is already taken' });
        }
      } else if (error.code === '23514') {
        setHandleError('Use 4-20 letters, numbers or underscores');
      } else {
        setToast({ type: 'error', text: 'Could not save profile' });
      }
      return;
    }

    if (!data || data.length === 0) {
      setToast({ type: 'error', text: 'Profile not found' });
      return;
    }

    setProfile(next);
    setIsEditing(false);
    setToast({ type: 'success', text: 'Profile saved!' });
  };

  const handleShare = async () => {
    const who = profile.handle ? `@${profile.handle}` : profile.username;
    const text = `Add me on Muster: ${who}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Muster', text });
      } else {
        await navigator.clipboard.writeText(text);
        setToast({ type: 'success', text: 'Copied to clipboard' });
      }
    } catch {}
  };

  if (checking || loadingProfile) return <FullScreenLoader />;

  const inputClass =
    'w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 px-3 font-inter font-medium text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-green-500';
  const labelClass = 'font-inter text-sm font-medium text-zinc-400';

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
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

      <main>
        {isEditing ? (
          /* ---------- РЕЖИМ РЕДАГУВАННЯ ---------- */
          <div className="profile-edit-layout">
            <div className="relative overflow-hidden">
              <Banner url={draft.bannerUrl} />
              <button
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploading === 'banner'}
                className="absolute inset-0 flex items-center justify-center bg-black/40 font-inter text-sm font-bold text-white transition-colors hover:bg-black/50"
              >
                {uploading === 'banner' ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Change banner
                  </span>
                )}
              </button>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleFile('banner', e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>

            <div className="relative mx-auto -mt-12 h-24 w-24">
              <AvatarCircle url={draft.avatarUrl} name={draft.username} />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading === 'avatar'}
                aria-label="Change avatar"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-950 bg-green-500 text-black transition-colors hover:bg-green-400"
              >
                {uploading === 'avatar' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleFile('avatar', e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>

            <div className="flex flex-col gap-5 px-4 pt-6 mx-auto max-w-md">
              <h2 className="text-center font-onest text-xl font-extrabold tracking-tight text-white">
                Edit Profile
              </h2>

              <div className="flex flex-col gap-2">
                <label htmlFor="nickname" className={labelClass}>
                  Nickname
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="nickname"
                    value={draft.username}
                    onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                    maxLength={24}
                    placeholder="Enter your nickname"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="handle" className={labelClass}>
                  Username
                </label>
                <div className="relative">
                  <AtSign className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="handle"
                    value={draft.handle}
                    onChange={(e) => {
                      setHandleError('');
                      setDraft({
                        ...draft,
                        handle: e.target.value.replace(/^@+/, '').replace(/\s/g, '').toLowerCase(),
                      });
                    }}
                    maxLength={20}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="your_username"
                    className={`${inputClass} pl-10 ${
                      handleError ? 'border-red-500/60 focus:border-red-500' : ''
                    }`}
                  />
                </div>
                {handleError ? (
                  <p className="flex items-center gap-1.5 font-inter text-xs font-medium text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {handleError}
                  </p>
                ) : (
                  <p className="font-inter text-xs font-medium text-zinc-500">
                    4-20 characters: letters, numbers and underscores
                  </p>
                )}
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

              <div className="mt-2 flex flex-col gap-3 pb-8">
                <button
                  onClick={handleSave}
                  disabled={!draft.username.trim() || saving || uploading !== null}
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
          </div>
        ) : (
          /* ---------- РЕЖИМ ПЕРЕГЛЯДУ ---------- */
          <div className="page-enter relative w-full">
            <Banner url={profile.bannerUrl} />

            <div className="relative -mt-12 flex flex-col items-center px-4">
              <div className="relative h-24 w-24">
                <AvatarCircle url={profile.avatarUrl} name={profile.username} />
              </div>

              <div className="mt-3 text-center">
                <h2 className="flex items-center justify-center gap-0.5 font-onest text-xl font-extrabold tracking-tight text-white">
                  {profile.is_sticker_creator === true && <StickerCreatorBadge className="h-6 w-6" />}
                  {profile.username || 'Player'}
                  {profile.is_verified === true && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/galka.png"
                      alt="Verified"
                      title="Verified"
                      className="h-6 w-6 shrink-0 object-contain"
                    />
                  )}
                  {profile.is_mini_app_creator === true && <MiniAppCreatorBadge className="h-6 w-6" />}
                </h2>
                <p className="font-inter text-sm font-medium text-zinc-500">
                  {profile.handle ? `@${profile.handle}` : 'No username yet'}
                </p>
              </div>

              <div className="mt-5 flex w-full max-w-md flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <InfoRow
                  Icon={Info}
                  color="text-zinc-400"
                  label="about me"
                  value={profile.bio || 'Nothing here yet'}
                  renderMentions
                />
                {profile.is_sticker_creator === true && <StickerCreatorNote />}
                {profile.is_mini_app_creator === true && <MiniAppCreatorNote />}
                {profile.telegram && (
                  <InfoRow
                    Icon={Send}
                    color="text-sky-400"
                    label="Telegram"
                    value={profile.telegram}
                    href={normalizeLink('telegram', profile.telegram)}
                  />
                )}
                {profile.youtube && (
                  <InfoRow
                    Icon={Youtube}
                    color="text-red-500"
                    label="YouTube"
                    value={profile.youtube}
                    href={normalizeLink('youtube', profile.youtube)}
                  />
                )}
                {profile.instagram && (
                  <InfoRow
                    Icon={Instagram}
                    color="text-pink-500"
                    label="Instagram"
                    value={profile.instagram}
                    href={normalizeLink('instagram', profile.instagram)}
                  />
                )}
              </div>

              <div className="mt-4 grid w-full max-w-md grid-cols-3 gap-2 pb-6">
                <button
                  onClick={startEditing}
                  className="flex flex-col items-center gap-1 rounded-xl bg-green-500 py-3 font-inter text-xs font-bold text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-colors hover:bg-green-400"
                >
                  <Pencil className="h-5 w-5" />
                  Edit
                </button>
                <Link
                  href="/settings"
                  className="flex flex-col items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 py-3 font-inter text-xs font-bold text-zinc-300 transition-all hover:border-zinc-700 hover:text-white"
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </Link>
                <button
                  onClick={handleShare}
                  className="flex flex-col items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 py-3 font-inter text-xs font-bold text-zinc-300 transition-all hover:border-zinc-700 hover:text-white"
                >
                  <Share2 className="h-5 w-5" />
                  Share
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {toast && (
        <div
          className={`toast-in fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl border bg-zinc-900 px-4 py-3 font-inter font-bold ${
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
