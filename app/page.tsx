'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, UserPlus, Users, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/lib/useRequireAuth';
import PlayerCard, { Player } from '@/components/PlayerCard';
import PageShell from '@/components/PageShell';
import FullScreenLoader from '@/components/FullScreenLoader';

type ProfileRow = {
  id: string;
  username: string | null;
  handle?: string | null;
  avatar_url?: string | null;
  game?: string | null;
  status?: string | null;
};

// Ключ гри для порівняння: без регістру та зайвих пробілів
const gameKey = (g?: string | null) => (g ?? '').trim().toLowerCase();

export default function Home() {
  const { user, checking } = useRequireAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [gameFilter, setGameFilter] = useState<string | null>(null); // gameKey вибраної гри

  // Завантажуємо лише тих, у кого встановлено статус (роль)
  useEffect(() => {
    if (!user) return;

    const loadPlayers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .not('status', 'is', null)
        .neq('status', '');

      if (error) {
        console.error('Supabase error:', error.message);
        setFailed(true);
      } else {
        setPlayers(
          ((data as ProfileRow[]) ?? [])
            .filter((p) => (p.status ?? '').trim() !== '')
            .map((p) => ({
              id: p.id,
              nickname: p.username ?? 'Player',
              handle: p.handle ?? '',
              avatarUrl: p.avatar_url ?? '',
              game: p.game?.trim() ?? '',
              status: p.status ?? '',
            }))
        );
      }
      setLoading(false);
    };
    loadPlayers();
  }, [user]);

  // Унікальні ігри із завантажених гравців (для фільтра) з кількістю гравців
  const games = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    players.forEach((p) => {
      const key = gameKey(p.game);
      if (!key) return;
      const cur = map.get(key);
      if (cur) cur.count += 1;
      else map.set(key, { label: p.game as string, count: 1 });
    });
    return Array.from(map.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [players]);

  const activeGameLabel = games.find((g) => g.key === gameFilter)?.label ?? null;

  // Локальний пошук + фільтр за грою по вже завантаженому списку
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, '');
    return players.filter((p) => {
      if (gameFilter && gameKey(p.game) !== gameFilter) return false;
      if (!q) return true;
      return (
        p.nickname.toLowerCase().includes(q) ||
        (p.handle ?? '').toLowerCase().includes(q) ||
        (p.game ?? '').toLowerCase().includes(q)
      );
    });
  }, [players, query, gameFilter]);

  if (checking) return <FullScreenLoader />;

  const hasActiveSearch = query.trim() !== '' || gameFilter !== null;

  return (
    <PageShell>
      <button className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3.5 font-inter font-bold text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-colors hover:bg-green-400">
        <UserPlus className="h-5 w-5" />
        Set a role
      </button>

      {/* Пошук і кнопка фільтрів */}
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, @username or game"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-3 font-inter font-medium text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-green-500"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          aria-label="Filters"
          aria-expanded={showFilters}
          className={`relative flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl border bg-zinc-900 transition-all ${
            showFilters || gameFilter
              ? 'border-green-500 text-green-500'
              : 'border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="h-5 w-5" />
          {gameFilter && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-green-500" />
          )}
        </button>
      </div>

      {/* Панель фільтра: вибір гри */}
      {showFilters && (
        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-inter text-sm font-bold text-white">Game</p>
            {gameFilter && (
              <button
                onClick={() => setGameFilter(null)}
                className="font-inter text-xs font-bold text-green-500 transition-colors hover:text-green-400"
              >
                Reset
              </button>
            )}
          </div>

          {games.length === 0 ? (
            <p className="font-inter text-sm font-medium text-zinc-500">
              No games set by players yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setGameFilter(null)}
                className={`rounded-full border px-3 py-1.5 font-inter text-sm font-bold transition-colors ${
                  gameFilter === null
                    ? 'border-green-500 bg-green-500 text-black'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                All games
              </button>
              {games.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setGameFilter(g.key)}
                  className={`rounded-full border px-3 py-1.5 font-inter text-sm font-bold transition-colors ${
                    gameFilter === g.key
                      ? 'border-green-500 bg-green-500 text-black'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  {g.label}
                  <span className={gameFilter === g.key ? 'ml-1.5 text-black/60' : 'ml-1.5 text-zinc-500'}>
                    {g.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Активний фільтр, коли панель закрита */}
      {!showFilters && activeGameLabel && (
        <div className="mb-4 flex">
          <button
            onClick={() => setGameFilter(null)}
            className="flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-500/10 py-1.5 pl-3 pr-2 font-inter text-sm font-bold text-green-400 transition-colors hover:bg-green-500/20"
          >
            {activeGameLabel}
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Список */}
      {loading ? (
        <p className="py-16 text-center font-inter font-medium text-zinc-500">Loading...</p>
      ) : failed ? (
        <p className="py-16 text-center font-inter font-medium text-zinc-500">
          Couldn&apos;t load players. Try again later.
        </p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
            <Users className="h-8 w-8 text-zinc-500" />
          </div>
          <p className="font-inter font-medium text-zinc-400">
            {hasActiveSearch && players.length > 0
              ? 'No players found.'
              : 'No players online right now. Be the first!'}
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
