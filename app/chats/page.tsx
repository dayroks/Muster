'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, MessageCircle, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/lib/useRequireAuth';
import PageShell from '@/components/PageShell';
import FullScreenLoader from '@/components/FullScreenLoader';

type ChatUser = {
  id: string;
  username: string | null;
  status?: string | null;
  avatar_url?: string | null;
};

export default function ChatsPage() {
  const { user, checking } = useRequireAuth();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id);

      if (error) {
        console.error('Supabase error:', error.message);
        setFailed(true);
      } else {
        setUsers((data as ChatUser[]) ?? []);
      }
      setLoading(false);
    };
    load();
  }, [user]);

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
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
            <MessageCircle className="h-8 w-8 text-zinc-500" />
          </div>
          <p className="font-inter font-medium text-zinc-400">
            No chats yet. Find players to start messaging!
          </p>
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
          {users.map((u) => {
            const name = u.username || 'Unknown';
            return (
              <li key={u.id} className="border-b border-zinc-800/50">
                <Link
                  href={`/chats/chat?id=${u.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-zinc-900/60 active:bg-zinc-900"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-500">
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar_url} alt={name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-onest text-lg font-extrabold text-black">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-inter font-bold text-white">{name}</p>
                    <p className="truncate font-inter text-sm font-medium text-zinc-500">
                      {u.status || 'Looking for game'}
                    </p>
                  </div>

                  <ChevronRight className="h-5 w-5 shrink-0 text-zinc-600" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
