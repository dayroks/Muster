'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  UserPlus,
  Users,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/lib/useRequireAuth';
import PlayerCard, { Player } from '@/components/PlayerCard';
import PageShell from '@/components/PageShell';
import FullScreenLoader from '@/components/FullScreenLoader';
import SetRoleModal from '@/components/SetRoleModal';

type ProfileRow = {
  id: string;
  username: string | null;
  handle?: string | null;
  avatar_url?: string | null;
  game?: string | null;
  status?: string | null;
  is_verified?: boolean | null;
};

const gameKey = (game?: string | null) =>
  (game ?? '').trim().toLowerCase();

export default function Home() {
  const { user, checking } = useRequireAuth();

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [gameFilter, setGameFilter] = useState<string | null>(null);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [savingGame, setSavingGame] = useState(false);

  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Завантаження профілів, які обрали гру
  const loadPlayers = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setFailed(false);

    // ВИПРАВЛЕНО: Беремо тільки тих, у кого поле game не пусте
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, handle, avatar_url, game, status, is_verified')
      .not('game', 'is', null)
      .neq('game', '');

    if (error) {
      console.error('Supabase players load error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      setFailed(true);
      setPlayers([]);
      setLoading(false);
      return;
    }

    // ВИПРАВЛЕНО: Залишаємо тільки ті профілі, де реально є текст гри
    const validProfiles = ((data as ProfileRow[]) ?? []).filter(
      (profile) => (profile.game ?? '').trim() !== ''
    );

    setPlayers(
      validProfiles.map((profile) => ({
        id: profile.id,
        nickname: profile.username ?? 'Player',
        handle: profile.handle ?? '',
        avatarUrl: profile.avatar_url ?? '',
        game: profile.game?.trim() ?? '',
        status: profile.status ?? '',
        is_verified: profile.is_verified === true,
      }))
    );

    setLoading(false);
  }, [user?.id]);

  // Перше завантаження та повторне завантаження при зміні користувача
  useEffect(() => {
    if (!user?.id) return;

    loadPlayers();
  }, [user?.id, loadPlayers]);

  // Збереження вибраної гри
  const handleSelectGame = async (gameName: string): Promise<boolean> => {
    if (!user?.id || savingGame || !gameName.trim()) {
      return false;
    }

    setSavingGame(true);
    setToast(null);

    const { data, error } = await supabase
      .from('profiles')
      .update({
        game: gameName.trim(),
        status: 'Looking for game',
      })
      .eq('id', user.id)
      .select('id, game, status')
      .maybeSingle();

    setSavingGame(false);

    if (error) {
      console.error('Supabase game save error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      setToast({
        type: 'error',
        text: `Save failed: ${error.message}`,
      });

      return false;
    }

    if (!data) {
      setToast({
        type: 'error',
        text: 'Profile not found or update permission denied.',
      });

      return false;
    }

    setToast({
      type: 'success',
      text: `You are now looking for a game in ${gameName}!`,
    });

    return true;
  };

  // Ігри для фільтра
  const games = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();

    players.forEach((player) => {
      const key = gameKey(player.game);

      if (!key) return;

      const current = map.get(key);

      if (current) {
        current.count += 1;
      } else {
        map.set(key, {
          label: player.game as string,
          count: 1,
        });
      }
    });

    return Array.from(map.entries())
      .map(([key, value]) => ({
        key,
        ...value,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [players]);

  const activeGameLabel =
    games.find((game) => game.key === gameFilter)?.label ?? null;

  // Пошук і фільтрація
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, '');

    return players.filter((player) => {
      if (gameFilter && gameKey(player.game) !== gameFilter) {
        return false;
      }

      if (!q) return true;

      return (
        player.nickname.toLowerCase().includes(q) ||
        (player.handle ?? '').toLowerCase().includes(q) ||
        (player.game ?? '').toLowerCase().includes(q)
      );
    });
  }, [players, query, gameFilter]);

  if (checking) return <FullScreenLoader />;

  const hasActiveSearch =
    query.trim() !== '' || gameFilter !== null;

  return (
    <PageShell>
      {/* Set a role */}
      <button
        onClick={() => {
          setToast(null);
          setShowRoleModal(true);
        }}
        disabled={savingGame}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3.5 font-inter font-bold text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-colors hover:bg-green-400 disabled:opacity-50"
      >
        {savingGame ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <UserPlus className="h-5 w-5" />
        )}
        Set a role
      </button>

      {/* Пошук і фільтри */}
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, @username or game"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-3 font-inter font-medium text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-green-500"
          />
        </div>

        <button
          onClick={() => setShowFilters((value) => !value)}
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

      {/* Фільтр за грою */}
      {showFilters && (
        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-inter text-sm font-bold text-white">
              Game
            </p>

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

              {games.map((game) => (
                <button
                  key={game.key}
                  onClick={() => setGameFilter(game.key)}
                  className={`rounded-full border px-3 py-1.5 font-inter text-sm font-bold transition-colors ${
                    gameFilter === game.key
                      ? 'border-green-500 bg-green-500 text-black'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  {game.label}

                  <span
                    className={
                      gameFilter === game.key
                        ? 'ml-1.5 text-black/60'
                        : 'ml-1.5 text-zinc-500'
                    }
                  >
                    {game.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Активний фільтр */}
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

      {/* Список гравців */}
      {loading ? (
        <p className="py-16 text-center font-inter font-medium text-zinc-500">
          Loading...
        </p>
      ) : failed ? (
        <p className="py-16 text-center font-inter font-medium text-zinc-500">
          Couldn't load players. Try again later.
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

      {/* Set Role Modal */}
      <SetRoleModal
        open={showRoleModal}
        user={user}
        onClose={() => setShowRoleModal(false)}
        onSelectGame={handleSelectGame}
        onSaved={loadPlayers}
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 z-[110] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-xl border bg-zinc-900 px-4 py-3 font-inter text-sm font-bold shadow-xl ${
            toast.type === 'success'
              ? 'border-green-500/30 text-green-400'
              : 'border-red-500/30 text-red-400'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}

          {toast.text}
        </div>
      )}
    </PageShell>
  );
        }
