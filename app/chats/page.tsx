'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageShell from '@/components/PageShell';

type ChatUser = {
  id: string;
  username: string | null;
  status?: string | null;
};

export default function ChatsPage() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      let myId = '';
      try {
        myId = localStorage.getItem('muster_user_id') ?? '';
      } catch {}

      let q = supabase.from('profiles').select('*');
      if (myId) q = q.neq('id', myId);

      const { data, error } = await q;
      if (error) {
        console.error('Supabase error:', error.message);
      } else {
        setUsers((data as ChatUser[]) ?? []);
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <PageShell>
      <h2 className="mb-4 font-onest text-2xl font-extrabold tracking-tight text-white">
        Chats
      </h2>

      {loading ? (
        <p className="py-16 text-center font-inter font-medium text-zinc-500">Loading...</p>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
            <MessageCircle className="h-8 w-8 text-zinc-500" />
          </div>
          <p className="font-inter font-medium text-zinc-400">
            No other players yet. Invite your friends!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {users.map((u) => {
            const name = u.username || 'Unknown';
            const status = u.status || 'offline';
            const isOnline = status.toLowerCase() === 'online';
            return (
              <Link
                key={u.id}
                href={`/chats/chat?id=${u.id}`}
                className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-all hover:border-zinc-700"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-green-500 bg-zinc-800">
                  <span className="font-onest text-lg font-extrabold text-white">
                    {name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-inter font-bold text-white">{name}</p>
                  <p className="flex items-center gap-2 font-inter text-sm font-medium text-zinc-400">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-600'
                      }`}
                    />
                    {status}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
