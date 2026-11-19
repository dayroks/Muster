'use client';

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  AlertCircle,
  AppWindow,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Wrench,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MiniAppCreatorBadge } from '@/components/MiniAppCreatorBadge';

type MiniApp = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  icon: string;
  icon_url: string | null;
  url: string;
};

type Owner = { username: string | null; is_mini_app_creator: boolean | null };

type OwnerRow = { id: string; username: string | null; is_mini_app_creator: boolean | null };

const EMPTY_FORM = { name: '', description: '', icon: '🧩', iconUrl: '', url: '' };

const ICON_BUCKET = 'avatars';
const MAX_ICON_FILE = 5 * 1024 * 1024; // 5 MB
const MAX_SAVE_BYTES = 48000; // ліміт збереження прогресу на користувача/міні-ап

const inputClass =
  'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-inter font-medium text-white outline-none placeholder:text-zinc-500 focus:border-green-500';

// Іконка міні-апу: картинка або емодзі
function AppIcon({
  icon,
  iconUrl,
  className = 'h-11 w-11 text-2xl',
}: {
  icon: string;
  iconUrl?: string | null;
  className?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-800 ${className}`}
    >
      {iconUrl ? <img src={iconUrl} alt="" className="h-full w-full object-cover" /> : icon}
    </span>
  );
}

// Квадратна іконка 256x256 (обрізка по центру) для економії місця
async function squareIcon(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  const side = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size
  );
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))),
      'image/webp',
      0.9
    );
  });
}

// Дозволяємо лише https-посилання
function validateUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export default function MiniAppsPanel({ user }: { user: User }) {
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [owners, setOwners] = useState<Record<string, Owner>>({});
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [view, setView] = useState<'list' | 'creator' | 'form'>('list');
  const [openApp, setOpenApp] = useState<MiniApp | null>(null);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastSaveAt = useRef(0);

  const load = useCallback(async () => {
    setFailed(false);

    const [appsRes, meRes] = await Promise.all([
      supabase
        .from('mini_apps')
        .select('id, owner_id, name, description, icon, icon_url, url')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('is_mini_app_creator').eq('id', user.id).maybeSingle(),
    ]);

    if (appsRes.error) {
      console.error('Mini apps load error:', appsRes.error);
      setFailed(true);
      setLoading(false);
      return;
    }

    const list = (appsRes.data as MiniApp[]) ?? [];
    setApps(list);
    setIsCreator(meRes.data?.is_mini_app_creator === true);

    const ids = Array.from(new Set(list.map((a) => a.owner_id)));
    if (ids.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, is_mini_app_creator')
        .in('id', ids);

      const map: Record<string, Owner> = {};
      ((data as OwnerRow[]) ?? []).forEach((p) => {
        map[p.id] = { username: p.username, is_mini_app_creator: p.is_mini_app_creator };
      });
      setOwners(map);
    }

    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Міст між міні-апом і Muster: збереження/завантаження прогресу гравця.
  // Міні-ап не бачить сесію — усе робить Muster від імені поточного користувача.
  useEffect(() => {
    if (!openApp) return;
    const appId = openApp.id;

    const handler = async (event: MessageEvent) => {
      const frame = iframeRef.current;
      if (!frame || event.source !== frame.contentWindow) return;

      const msg = event.data as { muster?: boolean; id?: number; type?: string; payload?: unknown } | null;
      if (!msg || msg.muster !== true || typeof msg.id !== 'number') return;

      const target = event.origin === 'null' ? '*' : event.origin;
      const reply = (body: { data?: unknown; error?: string }) => {
        (event.source as Window | null)?.postMessage({ muster: true, id: msg.id, ...body }, target);
      };

      if (msg.type === 'load') {
        const { data, error: loadError } = await supabase
          .from('mini_app_saves')
          .select('data')
          .eq('user_id', user.id)
          .eq('app_id', appId)
          .maybeSingle();

        if (loadError) {
          console.error('Mini app load error:', loadError);
          reply({ error: 'load_failed' });
        } else {
          reply({ data: data?.data ?? null });
        }
        return;
      }

      if (msg.type === 'save') {
        const now = Date.now();
        if (now - lastSaveAt.current < 500) {
          reply({ error: 'too_many_requests' });
          return;
        }
        lastSaveAt.current = now;

        if (msg.payload === undefined || msg.payload === null) {
          reply({ error: 'invalid_data' });
          return;
        }

        let bytes = 0;
        try {
          bytes = new TextEncoder().encode(JSON.stringify(msg.payload)).length;
        } catch {
          reply({ error: 'invalid_data' });
          return;
        }

        if (bytes > MAX_SAVE_BYTES) {
          reply({ error: 'too_large' });
          return;
        }

        const { error: saveError } = await supabase.from('mini_app_saves').upsert(
          {
            user_id: user.id,
            app_id: appId,
            data: msg.payload,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,app_id' }
        );

        if (saveError) {
          console.error('Mini app save error:', saveError);
          reply({ error: 'save_failed' });
        } else {
          reply({ data: true });
        }
        return;
      }

      reply({ error: 'unknown_type' });
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [openApp, user.id]);

  const myApps = apps.filter((a) => a.owner_id === user.id);

  const startNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setView('form');
  };

  const startEdit = (app: MiniApp) => {
    setEditingId(app.id);
    setForm({
      name: app.name,
      description: app.description,
      icon: app.icon,
      iconUrl: app.icon_url ?? '',
      url: app.url,
    });
    setError(null);
    setView('form');
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const description = form.description.trim();
    const icon = form.icon.trim() || '🧩';
    const url = validateUrl(form.url);

    if (!name) {
      setError('Enter a name for your mini app.');
      return;
    }
    if (!url) {
      setError('Enter a valid link that starts with https://');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = { name, description, icon, icon_url: form.iconUrl || null, url };

    const res = editingId
      ? await supabase.from('mini_apps').update(payload).eq('id', editingId).select('id')
      : await supabase.from('mini_apps').insert({ ...payload, owner_id: user.id }).select('id');

    setSaving(false);

    if (res.error || !res.data || res.data.length === 0) {
      console.error('Mini app save error:', res.error);
      setError(res.error?.message ?? 'Could not save. You may not have permission.');
      return;
    }

    await load();
    setEditingId(null);
    setForm(EMPTY_FORM);
    setView('creator');
  };

  const handleIconFile = async (file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_ICON_FILE) {
      setError('Image is too large (max 5 MB).');
      return;
    }

    setUploadingIcon(true);
    setError(null);

    try {
      const blob = await squareIcon(file);
      const ext = blob.type === 'image/png' ? 'png' : 'webp';
      const path = `${user.id}/miniapp-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(ICON_BUCKET)
        .upload(path, blob, { cacheControl: '3600', upsert: false, contentType: blob.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(ICON_BUCKET).getPublicUrl(path);
      setForm((f) => ({ ...f, iconUrl: data.publicUrl }));
    } catch (e) {
      console.error('Icon upload error:', e);
      setError('Could not upload the image. Try another one.');
    } finally {
      setUploadingIcon(false);
    }
  };

  // Відкриваємо міні-ап: підтягуємо збережений прогрес і передаємо його в хеші посилання,
  // щоб muster-sdk.js міг відновити localStorage ще до старту гри.
  const handleOpen = async (app: MiniApp) => {
    if (openingId) return;
    setOpeningId(app.id);

    let src = app.url;

    try {
      const { data } = await supabase
        .from('mini_app_saves')
        .select('data')
        .eq('user_id', user.id)
        .eq('app_id', app.id)
        .maybeSingle();

      const snapshot = data?.data;

      if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
        const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
        let bin = '';
        bytes.forEach((b) => {
          bin += String.fromCharCode(b);
        });
        const encoded = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        if (encoded.length < 100000) {
          src = `${app.url.split('#')[0]}#__muster=${encoded}`;
        }
      }
    } catch (e) {
      console.error('Mini app open error:', e);
    }

    setFrameSrc(src);
    setOpenApp(app);
    setOpeningId(null);
  };

  const closeApp = () => {
    setOpenApp(null);
    setFrameSrc(null);
  };

  const handleDelete = async (app: MiniApp) => {
    if (!window.confirm(`Delete "${app.name}"?`)) return;

    setError(null);

    const { data, error: delError } = await supabase
      .from('mini_apps')
      .delete()
      .eq('id', app.id)
      .select('id');

    if (delError || !data || data.length === 0) {
      setError(delError?.message ?? 'Could not delete this mini app.');
      return;
    }

    await load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-green-500" />
      </div>
    );
  }

  if (failed) {
    return (
      <p className="py-16 text-center font-inter font-medium text-zinc-500">
        Could not load mini apps. Try again later.
      </p>
    );
  }

  /* ---------- Утиліта Mini Apps Creator: форма ---------- */
  if (view === 'form') {
    return (
      <div className="anim-sheet">
        <button
          onClick={() => setView('creator')}
          className="mb-4 flex items-center gap-2 font-inter text-sm font-bold text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h3 className="mb-4 font-onest text-xl font-extrabold text-white">
          {editingId ? 'Edit mini app' : 'New mini app'}
        </h3>

        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              maxLength={8}
              aria-label="Icon (emoji)"
              className={`${inputClass} w-20 text-center text-2xl`}
            />
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={40}
              placeholder="Name"
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <AppIcon icon={form.icon} iconUrl={form.iconUrl} className="h-14 w-14 text-3xl" />
            <div className="flex flex-wrap gap-2">
              <label
                className={`cursor-pointer rounded-lg bg-zinc-800 px-3 py-2 font-inter text-sm font-bold text-white hover:bg-zinc-700 ${
                  uploadingIcon ? 'pointer-events-none opacity-60' : ''
                }`}
              >
                {uploadingIcon ? 'Uploading...' : 'Upload image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingIcon}
                  onChange={(e) => {
                    void handleIconFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </label>
              {form.iconUrl && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, iconUrl: '' })}
                  className="rounded-lg px-3 py-2 font-inter text-sm font-bold text-red-400 hover:bg-red-500/10"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            maxLength={120}
            placeholder="Short description"
            className={inputClass}
          />

          <input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            maxLength={300}
            placeholder="https://yourname.github.io/app"
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="url"
            className={inputClass}
          />

          <p className="font-inter text-xs font-medium leading-relaxed text-zinc-500">
            Paste the link to your finished website (for example GitHub Pages). It opens inside
            Muster, so the site must allow being embedded.
          </p>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 font-inter text-sm font-medium text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || uploadingIcon}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3 font-inter font-bold text-black hover:bg-green-400 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editingId ? 'Save changes' : 'Publish mini app'}
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Утиліта Mini Apps Creator: мої міні-апи ---------- */
  if (view === 'creator') {
    return (
      <div className="anim-sheet">
        <button
          onClick={() => setView('list')}
          className="mb-4 flex items-center gap-2 font-inter text-sm font-bold text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-onest text-xl font-extrabold text-white">Mini Apps Creator</h3>
          <button
            onClick={startNew}
            className="flex items-center gap-1.5 rounded-xl bg-green-500 px-3 py-2 font-inter text-sm font-bold text-black hover:bg-green-400"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>

        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 font-inter text-sm font-medium text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {myApps.length === 0 ? (
          <p className="py-12 text-center font-inter font-medium text-zinc-500">
            You have no mini apps yet. Tap “New” to publish your first one.
          </p>
        ) : (
          <ul className="stagger space-y-2">
            {myApps.map((app) => (
              <li
                key={app.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3"
              >
                <AppIcon icon={app.icon} iconUrl={app.icon_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-inter font-bold text-white">{app.name}</p>
                  <p className="truncate font-inter text-xs font-medium text-zinc-500">{app.url}</p>
                </div>
                <button
                  onClick={() => startEdit(app)}
                  aria-label="Edit"
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(app)}
                  aria-label="Delete"
                  className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  /* ---------- Список міні-апів ---------- */
  return (
    <>
      <ul className="stagger space-y-2">
        {isCreator && (
          <li>
            <button
              onClick={() => {
                setError(null);
                setView('creator');
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-left hover:bg-cyan-500/15"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white">
                <Wrench className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-inter font-bold text-white">Mini Apps Creator</p>
                <p className="font-inter text-xs font-medium text-cyan-200/70">
                  System app · publish and manage your mini apps
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-cyan-200/60" />
            </button>
          </li>
        )}

        {apps.map((app) => {
          const owner = owners[app.owner_id];

          return (
            <li key={app.id}>
              <button
                onClick={() => void handleOpen(app)}
                disabled={openingId !== null}
                className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-left hover:border-zinc-700"
              >
                <AppIcon icon={app.icon} iconUrl={app.icon_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-inter font-bold text-white">{app.name}</p>
                  {app.description && (
                    <p className="truncate font-inter text-xs font-medium text-zinc-400">
                      {app.description}
                    </p>
                  )}
                  <p className="mt-0.5 flex items-center gap-1 truncate font-inter text-xs font-medium text-zinc-500">
                    by {owner?.username || 'Unknown'}
                    {owner?.is_mini_app_creator === true && <MiniAppCreatorBadge className="h-3.5 w-3.5" />}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-zinc-600" />
              </button>
            </li>
          );
        })}
      </ul>

      {apps.length === 0 && !isCreator && (
        <div className="py-16 text-center">
          <AppWindow className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
          <p className="font-inter font-medium text-zinc-500">No mini apps yet.</p>
        </div>
      )}

      {/* Відкритий міні-ап: ізольований iframe */}
      {openApp && (
        <div className="anim-backdrop fixed inset-0 z-[90] flex flex-col bg-zinc-950">
          <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-3 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
            <button
              onClick={closeApp}
              aria-label="Close mini app"
              className="rounded-lg p-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <AppIcon icon={openApp.icon} iconUrl={openApp.icon_url} className="h-9 w-9 text-xl" />
            <p className="min-w-0 flex-1 truncate font-onest text-lg font-extrabold text-white">
              {openApp.name}
            </p>
            <a
              href={openApp.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in browser"
              className="rounded-lg p-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
          </div>

          <iframe
            key={openApp.id}
            ref={iframeRef}
            src={frameSrc ?? openApp.url}
            title={openApp.name}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
            referrerPolicy="no-referrer"
            className="min-h-0 w-full flex-1 border-0 bg-white"
          />
        </div>
      )}
    </>
  );
}
