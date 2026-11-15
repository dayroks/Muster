'use client';

import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, UserPlus, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PlayerCard, { Player } from '@/components/PlayerCard';
import PageShell from '@/components/PageShell';

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const loadPlayers = async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) {
        console.error('Supabase error:', error.message);
      } else {
        setPlayers((data as Player[]) ?? []);
      }
      setLoading(false);
    };
    loadPlayers();
  }, []);

  const filtered = players.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return p.nickname?.toLowerCase().includes(q) || p.game?.toLowerCase().includes(q);
  });

  return (
    <PageShell>
      <button className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3.5 font-inter font-bold text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-colors hover:bg-green-400">
        <UserPlus className="h-5 w-5" />
        Set a role
      </button>

      <div className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a player..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-3 font-inter font-medium text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-green-500"
          />
        </div>
        <button
          aria-label="Filters"
          className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition-all hover:border-zinc-700 hover:text-white"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <p className="py-16 text-center font-inter font-medium text-zinc-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
            <Users className="h-8 w-8 text-zinc-500" />
          </div>
          <p className="font-inter font-medium text-zinc-400">
            No players online right now. Be the first!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
