'use client';

import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, UserPlus, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PlayerCard, { Player } from '@/components/PlayerCard';

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
    return (
      p.nickname?.toLowerCase().includes(q) ||
      p.game?.toLowerCase().includes(q)
    );
  });

  return (
    <main className="mx-auto min-h-screen max-w-md bg-neutral-900 px-4 py-6 text-white">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Muster</h1>
        <button className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
          <UserPlus className="h-4 w-4" />
          Set a role
        </button>
      </header>

      <div className="mb-6 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-[#2C2C2C] px-3">
          <Search className="h-5 w-5 text-white/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players or games"
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-white/40"
          />
        </div>
        <button
          aria-label="Filters"
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2C2C2C]"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <p className="text-center text-white/60">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-white/60">
          <Users className="h-12 w-12" />
          <p>No players online right now. Be the first!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>
      )}
    </main>
  );
          }
