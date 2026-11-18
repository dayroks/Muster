
'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  X,
  Gamepad2,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

type SetRoleModalProps = {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSelectGame: (gameName: string) => void | Promise<void>;
};

type Game = {
  id: string;
  name: string;
};

export default function SetRoleModal({
  open,
  user,
  onClose,
  onSelectGame,
}: SetRoleModalProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [requestMode, setRequestMode] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);

  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Завантаження ігор при відкритті модального вікна
  useEffect(() => {
    if (!open) return;

    let active = true;

    const loadGames = async () => {
      setLoading(true);
      setMessage(null);
      setRequestMode(false);
      setSelectedGame(null);

      const { data, error } = await supabase
        .from('games')
        .select('id, name')
        .order('name', { ascending: true });

      if (!active) return;

      if (error) {
        console.error('Games loading error:', error.message);

        setMessage({
          type: 'error',
          text: 'Could not load games. Please try again.',
        });
      } else {
        setGames((data as Game[]) ?? []);
      }

      setLoading(false);
    };

    loadGames();

    return () => {
      active = false;
    };
  }, [open]);

  if (!open) return null;

  // Вибір гри
  const handleSaveGame = async () => {
    if (!selectedGame || !user?.id) return;

    await onSelectGame(selectedGame);
  };

  // Надсилання запиту на додавання гри
  const handleRequestGame = async () => {
    const gameName = newGameName.trim();

    if (!gameName || !user?.id || requestLoading) return;

    setRequestLoading(true);
    setMessage(null);

    const { error } = await supabase
      .from('game_requests')
      .insert({
        game_name: gameName,
        requested_by: user.id,
      });

    setRequestLoading(false);

    if (error) {
      console.error('Game request error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      setMessage({
        type: 'error',
        text: 'Could not send your request. Please try again.',
      });

      return;
    }

    setMessage({
      type: 'success',
      text: 'Game request sent successfully!',
    });

    setNewGameName('');

    setTimeout(() => {
      setRequestMode(false);
      setMessage(null);
    }, 1800);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="font-inter text-lg font-bold text-white">
              Set a role
            </h2>
            <p className="mt-0.5 font-inter text-sm text-zinc-500">
              Choose a game you want to play
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {!requestMode ? (
            <>
              {/* Список ігор */}
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-zinc-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-inter text-sm">Loading games...</span>
                </div>
              ) : games.length === 0 ? (
                <div className="py-8 text-center">
                  <Gamepad2 className="mx-auto mb-3 h-9 w-9 text-zinc-600" />
                  <p className="font-inter text-sm text-zinc-400">
                    No games available yet.
                  </p>
                </div>
              ) : (
                <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
                  {games.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => setSelectedGame(game.name)}
                      className={`flex items-center gap-2 rounded-xl border p-3 text-left font-inter text-sm font-bold transition-all ${
                        selectedGame === game.name
                          ? 'border-green-500 bg-green-500/10 text-green-400'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800'
                      }`}
                    >
                      <Gamepad2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{game.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Повідомлення */}
              {message && (
                <div
                  className={`mt-4 flex items-center gap-2 rounded-xl border p-3 font-inter text-sm ${
                    message.type === 'success'
                      ? 'border-green-500/30 bg-green-500/10 text-green-400'
                      : 'border-red-500/30 bg-red-500/10 text-red-400'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  {message.text}
                </div>
              )}

              {/* Кнопки */}
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={handleSaveGame}
                  disabled={!selectedGame || loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3 font-inter font-bold text-black transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save game
                </button>

                <button
                  onClick={() => {
                    setRequestMode(true);
                    setMessage(null);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 py-3 font-inter text-sm font-bold text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
                >
                  <Plus className="h-4 w-4" />
                  Request a new game
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Форма запиту нової гри */}
              <div>
                <h3 className="font-inter font-bold text-white">
                  Request a game
                </h3>

                <p className="mt-1 font-inter text-sm text-zinc-500">
                  Tell us which game you want to see in Muster.
                </p>

                <input
                  value={newGameName}
                  onChange={(event) => setNewGameName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleRequestGame();
                  }}
                  placeholder="Enter game name"
                  maxLength={60}
                  className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-inter text-sm text-white outline-none placeholder:text-zinc-500 focus:border-green-500"
                />

                {message && (
                  <div
                    className={`mt-3 flex items-center gap-2 rounded-xl border p-3 font-inter text-sm ${
                      message.type === 'success'
                        ? 'border-green-500/30 bg-green-500/10 text-green-400'
                        : 'border-red-500/30 bg-red-500/10 text-red-400'
                    }`}
                  >
                    {message.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    {message.text}
                  </div>
                )}

                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => {
                      setRequestMode(false);
                      setMessage(null);
                    }}
                    disabled={requestLoading}
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-3 font-inter text-sm font-bold text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Back
                  </button>

                  <button
                    onClick={handleRequestGame}
                    disabled={!newGameName.trim() || requestLoading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500 py-3 font-inter text-sm font-bold text-black transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {requestLoading && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Send request
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
