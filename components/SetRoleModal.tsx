
'use client';

import { useEffect, useState } from 'react';
import { X, Gamepad2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type Game = {
  id: string;
  name: string;
};

type SetRoleModalProps = {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSelectGame: (gameName: string) => void;
};

export default function SetRoleModal({
  open,
  user,
  onClose,
  onSelectGame,
}: SetRoleModalProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [gameName, setGameName] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;

    const loadGames = async () => {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('games')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        console.error('Games loading error:', error);
        setError('Could not load games. Please try again.');
      } else {
        setGames((data as Game[]) ?? []);
      }

      setLoading(false);
    };

    loadGames();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setShowRequest(false);
      setGameName('');
      setError('');
      setSuccess(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSendRequest = async () => {
    if (!user || !gameName.trim()) return;

    setSending(true);
    setError('');

    const { error } = await supabase
      .from('game_requests')
      .insert({
        game_name: gameName.trim(),
        requested_by: user.id,
      });

    setSending(false);

    if (error) {
      console.error('Request error:', error);
      setError('Could not send your request. Please try again.');
      return;
    }

    setSuccess(true);
    setShowRequest(false);
    setGameName('');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-onest text-xl font-extrabold text-white">
              Choose a game
            </h2>
            <p className="mt-1 font-inter text-sm text-zinc-500">
              Select the game you want to play.
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3 font-inter text-sm font-semibold text-green-400">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Request sent! Awaiting admin approval.
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-green-500" />
          </div>
        ) : games.length === 0 ? (
          <div className="py-8 text-center">
            <Gamepad2 className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
            <p className="font-inter text-sm text-zinc-500">
              No games available yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => onSelectGame(game.name)}
                className="flex min-h-16 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3 font-inter text-sm font-bold text-zinc-200 transition-all hover:border-green-500/60 hover:bg-green-500/10 hover:text-green-400"
              >
                <Gamepad2 className="h-4 w-4 shrink-0" />
                <span className="break-words">{game.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="my-5 border-t border-zinc-800" />

        {!showRequest ? (
          <button
            onClick={() => {
              setSuccess(false);
              setError('');
              setShowRequest(true);
            }}
            className="w-full rounded-xl border border-green-500/30 bg-green-500/10 py-3 font-inter text-sm font-bold text-green-400 transition-colors hover:bg-green-500/20"
          >
            Can't find your game? Request it
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="font-inter text-sm font-bold text-white">
              Game name
            </label>

            <input
              autoFocus
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendRequest();
              }}
              placeholder="Enter game name..."
              maxLength={100}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-inter text-sm text-white outline-none placeholder:text-zinc-500 focus:border-green-500"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRequest(false);
                  setError('');
                }}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-3 font-inter text-sm font-bold text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                Cancel
              </button>

              <button
                onClick={handleSendRequest}
                disabled={!gameName.trim() || sending || !user}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500 py-3 font-inter text-sm font-bold text-black transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                Send
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 flex items-center gap-2 font-inter text-xs font-medium text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
