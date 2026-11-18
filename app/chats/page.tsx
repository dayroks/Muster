'use client';

import { StickerCreatorBadge } from '@/components/StickerCreatorBadge';
import { MiniAppCreatorBadge } from '@/components/MiniAppCreatorBadge';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { MessageCircle, Search, Users, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/lib/useRequireAuth';
import PageShell from '@/components/PageShell';
import FullScreenLoader from '@/components/FullScreenLoader';

type Message = {
  id: string | number;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

type Peer = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
  is_sticker_creator?: boolean | null;
  is_mini_app_creator?: boolean | null;
};

type SearchUser = Peer & { handle: string | null };

const SEARCH_COLUMNS = 'id, username, handle, avatar_url, is_verified, is_sticker_creator, is_mini_app_creator';

// Час у стилі Telegram: сьогодні HH:MM, вчора, день тижня, інакше дата
function formatListTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);

  if (diffDays <= 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// Спільний рядок списку (і для активних чатів, і для результатів пошуку)
function UserRow({
  href,
  name,
  avatarUrl,
  subtitle,
  time,
  verified,
  stickerCreator,
  miniAppCreator,
}: {
  href: string;
  name: string;
  avatarUrl?: string | null;
  subtitle: ReactNode;
  time?: string;
  verified?: boolean;
  stickerCreator?: boolean;
  miniAppCreator?: boolean;
}) {
  return (
    <li className="border-b border-zinc-800/50">
      <Link
        href={href}
        className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-zinc-900/60 active:bg-zinc-900"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-500">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="font-onest text-lg font-extrabold text-black">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-0.5 font-inter font-bold text-white">
            {stickerCreator === true && <StickerCreatorBadge className="h-5 w-5" />}
            <span className="truncate">{name}</span>
            {verified === true && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/galka.png"
                alt="Verified"
                title="Verified"
                className="h-5 w-5 shrink-0 object-contain"
              />
            )}
            {miniAppCreator === true && <MiniAppCreatorBadge className="h-5 w-5" />}
          </p>
          <p className="truncate font-inter text-sm font-medium text-zinc-500">{subtitle}</p>
        </div>

        {time && (
          <span className="shrink-0 self-start pt-1 font-inter text-xs font-medium text-zinc-500">
            {time}
          </span>
        )}
      </Link>
    </li>
  );
}

export default function ChatsPage() {
  const { user, checking } = useRequireAuth();

  /* ---------- Активні чати ---------- */
  const [last, setLast] = useState<Record<string, Message>>({});
  const [profiles, setProfiles] = useState<Record<string, Peer>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const profilesRef = useRef<Record<string, Peer>>({});

  /* ---------- Глобальний пошук ---------- */
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const searchSeq = useRef(0);

  // Історія повідомлень + realtime
  useEffect(() => {
    if (!user) return;
    const me = user.id;
    let active = true;

    const ensureProfiles = async (ids: string[]) => {
      const missing = ids.filter((id) => !profilesRef.current[id]);
      if (missing.length === 0) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_verified, is_sticker_creator, is_mini_app_creator')
        .in('id', missing);

      if (error) {
        console.error('Profiles error:', error.message);
        return;
      }
      if (!active) return;

      const added: Record<string, Peer> = {};
      ((data as Peer[]) ?? []).forEach((p) => {
        added[p.id] = p;
      });
      profilesRef.current = { ...profilesRef.current, ...added };
      setProfiles(profilesRef.current);
    };

    const applyMessage = (m: Message) => {
      const peer = m.sender_id === me ? m.receiver_id : m.sender_id;
      if (peer === me) return;

      setLast((prev) => {
        const cur = prev[peer];
        if (cur && new Date(cur.created_at) >= new Date(m.created_at)) return prev;
        return { ...prev, [peer]: m };
      });
      ensureProfiles([peer]);
    };

    const load = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${me},receiver_id.eq.${me}`)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!active) return;

      if (error) {
        console.error('Messages error:', error.message);
        setFailed(true);
        setLoading(false);
        return;
      }

      const latest: Record<string, Message> = {};
      ((data as Message[]) ?? []).forEach((m) => {
        const peer = m.sender_id === me ? m.receiver_id : m.sender_id;
        if (peer !== me && !latest[peer]) latest[peer] = m;
      });

      setLast((prev) => {
        const merged = { ...prev };
        Object.entries(latest).forEach(([peer, m]) => {
          const cur = merged[peer];
          if (!cur || new Date(m.created_at) > new Date(cur.created_at)) merged[peer] = m;
        });
        return merged;
      });

      await ensureProfiles(Object.keys(latest));
      if (active) setLoading(false);
    };

    const channel = supabase
      .channel(`chats-list-${me}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${me}` },
        (payload) => applyMessage(payload.new as Message)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${me}` },
        (payload) => applyMessage(payload.new as Message)
      )
      .subscribe();

    load();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Глобальний пошук по profiles (з паузою 300 мс)
  useEffect(() => {
    if (!user) return;
    const me = user.id;
    const raw = query.trim().replace(/^@+/, '');
    const seq = ++searchSeq.current; // нова відповідь скасовує застарілі

    if (!raw) {
      setResults([]);
      setSearchLoading(false);
      setSearchFailed(false);
      return;
    }

    setSearchLoading(true);
    setSearchFailed(false);

    const timer = setTimeout(async () => {
      // екрануємо символи LIKE, щоб "_" і "%" шукались як звичайні символи
      const pattern = `%${raw.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

      const [byName, byHandle] = await Promise.all([
        supabase
          .from('profiles')
          .select(SEARCH_COLUMNS)
          .neq('id', me)
          .ilike('username', pattern)
          .limit(30),
        supabase
          .from('profiles')
          .select(SEARCH_COLUMNS)
          .neq('id', me)
          .ilike('handle', pattern)
          .limit(30),
      ]);

      if (seq !== searchSeq.current) return;

      if (byName.error) console.error('Search (name) error:', byName.error.message);
      if (byHandle.error) console.error('Search (username) error:', byHandle.error.message);

      if (byName.error && byHandle.error) {
        setSearchFailed(true);
        setResults([]);
        setSearchLoading(false);
        return;
      }

      // об'єднуємо результати без дублікатів
      const map = new Map<string, SearchUser>();
      [...((byName.data as SearchUser[]) ?? []), ...((byHandle.data as SearchUser[]) ?? [])].forEach(
        (u) => map.set(u.id, u)
      );

      setResults(
        Array.from(map.values())
          .sort((a, b) => (a.username ?? '').localeCompare(b.username ?? ''))
          .slice(0, 30)
      );
      setSearchLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, user]);

  // Активні чати за часом останнього повідомлення
  const items = useMemo(
    () =>
      Object.entries(last)
        .sort(
          (a, b) =>
            new Date(b[1].created_at).getTime() - new Date(a[1].created_at).getTime()
        )
        .map(([peerId, msg]) => ({ peerId, msg, peer: profiles[peerId] })),
    [last, profiles]
  );

  if (checking) return <FullScreenLoader />;

  const isSearching = query.trim() !== '';

  return (
    <PageShell>
      <div className="desktop-chats-layout">
      <section className="desktop-chats-list">
      <h2 className="mb-4 font-onest text-2xl font-extrabold tracking-tight text-white">
        Chats
      </h2>

      {/* Поле пошуку */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users by name or @username"
          autoCapitalize="none"
          autoCorrect="off"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-10 font-inter font-medium text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-green-500"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {isSearching ? (
        /* ---------- РЕЖИМ ПОШУКУ (по всій базі) ---------- */
        searchLoading ? (
          <p className="py-16 text-center font-inter font-medium text-zinc-500">Searching...</p>
        ) : searchFailed ? (
          <p className="py-16 text-center font-inter font-medium text-zinc-500">
            Search failed. Try again later.
          </p>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
              <Search className="h-8 w-8 text-zinc-500" />
            </div>
            <p className="font-inter font-medium text-zinc-400">No users found</p>
          </div>
        ) : (
          <ul className="stagger -mx-4">
            {results.map((u) => (
              <UserRow
                key={u.id}
                href={`/chats/chat?id=${u.id}`}
                name={u.username || 'Unknown'}
                avatarUrl={u.avatar_url}
                subtitle={u.handle ? `@${u.handle}` : 'No username yet'}
                verified={u.is_verified === true}
                stickerCreator={u.is_sticker_creator === true}
                miniAppCreator={u.is_mini_app_creator === true}
              />
            ))}
          </ul>
        )
      ) : /* ---------- АКТИВНІ ЧАТИ ---------- */ loading ? (
        <p className="py-16 text-center font-inter font-medium text-zinc-500">Loading...</p>
      ) : failed ? (
        <p className="py-16 text-center font-inter font-medium text-zinc-500">
          Couldn&apos;t load chats. Try again later.
        </p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
            <MessageCircle className="h-8 w-8 text-zinc-500" />
          </div>
          <div>
            <p className="font-inter font-bold text-white">No chats yet</p>
            <p className="mt-1 font-inter font-medium text-zinc-400">
              Search for a user above or find players to start messaging!
            </p>
          </div>
          <Link
            href="/"
            className="mt-2 flex items-center gap-2 rounded-xl bg-green-500 px-5 py-3 font-inter font-bold text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-colors hover:bg-green-400"
          >
            <Users className="h-5 w-5" />
            Find players
          </Link>
        </div>
      ) : (
        <ul className="stagger -mx-4">
          {items.map(({ peerId, msg, peer }) => {
            const mine = msg.sender_id === user?.id;
            return (
              <UserRow
                key={peerId}
                href={`/chats/chat?id=${peerId}`}
                name={peer?.username || 'Unknown'}
                avatarUrl={peer?.avatar_url}
                verified={peer?.is_verified === true}
                stickerCreator={peer?.is_sticker_creator === true}
                miniAppCreator={peer?.is_mini_app_creator === true}
                subtitle={
                  <>
                    {mine && <span className="text-zinc-400">You: </span>}
                    {msg.content}
                  </>
                }
                time={formatListTime(msg.created_at)}
              />
            );
          })}
        </ul>
      )}
      </section>
      <section className="desktop-chat-welcome">
        <div className="desktop-chat-welcome__mark"><MessageCircle className="h-9 w-9" /></div>
        <h3>Select a conversation</h3>
        <p>Choose a chat from the list or search for a player to start talking.</p>
      </section>
      </div>
    </PageShell>
  );
                                }
