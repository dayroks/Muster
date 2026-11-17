'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Users } from 'lucide-react';
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
};

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

export default function ChatsPage() {
  const { user, checking } = useRequireAuth();

  // peerId -> останнє повідомлення переписки
  const [last, setLast] = useState<Record<string, Message>>({});
  // peerId -> профіль співрозмовника
  const [profiles, setProfiles] = useState<Record<string, Peer>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const profilesRef = useRef<Record<string, Peer>>({});

  useEffect(() => {
    if (!user) return;
    const me = user.id;
    let active = true;

    // Підвантажує профілі лише тих співрозмовників, яких ще немає в стані
    const ensureProfiles = async (ids: string[]) => {
      const missing = ids.filter((id) => !profilesRef.current[id]);
      if (missing.length === 0) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
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

    // Зберігає повідомлення як останнє, лише якщо воно новіше за вже відоме
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

    // 1. Усі мої повідомлення (відправлені або отримані), від новіших до старіших
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

      // 2. Унікальні співрозмовники: перше повідомлення в списку і є останнім
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

      // 3. Профілі лише цих користувачів
      await ensureProfiles(Object.keys(latest));
      if (active) setLoading(false);
    };

    // Realtime: нові повідомлення оновлюють список без перезавантаження
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

  // 4. Сортування за часом останнього повідомлення (новіші вище)
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

  return (
    <PageShell>
      <h2 className="mb-2 font-onest text-2xl font-extrabold tracking-tight text-white">
        Chats
      </h2>

      {loading ? (
        <p className="py-16 text-center font-inter font-medium text-zinc-500">Loading...</p>
      ) : failed ? (
        <p className="py-16 text-center font-inter font-medium text-zinc-500">
          Couldn&apos;t load chats. Try again later.
        </p>
      ) : items.length === 0 ? (
        /* 6. Порожній стан */
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
            <MessageCircle className="h-8 w-8 text-zinc-500" />
          </div>
          <div>
            <p className="font-inter font-bold text-white">No chats yet</p>
            <p className="mt-1 font-inter font-medium text-zinc-400">
              Find players to start messaging!
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
        <ul className="-mx-4">
          {items.map(({ peerId, msg, peer }) => {
            const name = peer?.username || 'Unknown';
            const mine = msg.sender_id === user?.id;

            return (
              <li key={peerId} className="border-b border-zinc-800/50">
                <Link
                  href={`/chats/chat?id=${peerId}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-zinc-900/60 active:bg-zinc-900"
                >
                  {/* Аватарка */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-500">
                    {peer?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={peer.avatar_url}
                        alt={name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-onest text-lg font-extrabold text-black">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Ім'я та останнє повідомлення */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-inter font-bold text-white">{name}</p>
                    <p className="truncate font-inter text-sm font-medium text-zinc-500">
                      {mine && <span className="text-zinc-400">You: </span>}
                      {msg.content}
                    </p>
                  </div>

                  {/* Час */}
                  <span className="shrink-0 self-start pt-1 font-inter text-xs font-medium text-zinc-500">
                    {formatListTime(msg.created_at)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
        }
