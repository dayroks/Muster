
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
  Coffee,
  Swords,
  Moon,
  Zap,
  XCircle,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

export type PlayStyle = 'chill' | 'competitive';

export type RoleOptions = {
  playStyle: PlayStyle;
  afk: boolean;
};

type SetRoleModalProps = {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSelectGame: (gameName: string, options: RoleOptions) => Promise<boolean>;
  onClearRole: () => Promise<boolean>;
  onSaved: () => Promise<void>;
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
  onClearRole,
  onSaved,
}: SetRoleModalProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [playStyle, setPlayStyle] = useState<PlayStyle>('chill');
  const [afk, setAfk] = useState(false);
  const [hasRole, setHasRole] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [saving, setSaving] = useState(false);
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
        console.error('Games loading error:', {
          message: error.message,
          code: error.code,
          details: error.details,
        });

        setMessage({
          type: 'error',
          text: 'Could not load games. Please try again.',
        });
      } else {
        setGames((data as Game[]) ?? []);
      }

      // Підтягуємо поточну роль користувача, щоб її можна було змінити або скасувати
      if (user?.id) {
        const { data: me } = await supabase
          .from('profiles')
          .select('game, play_style, status')
          .eq('id', user.id)
          .maybeSingle();

        if (active && me) {
          const currentGame = (me.game ?? '').trim();
          setHasRole(currentGame !== '');
          setSelectedGame(currentGame !== '' ? currentGame : null);
          setPlayStyle(me.play_style === 'competitive' ? 'competitive' : 'chill');
          setAfk(me.status === 'AFK');
        }
      }

      setLoading(false);
    };

    loadGames();

    return () => {
      active = false;
    };
  }, [open, user?.id]);

  if (!open) return null;

  // Збереження гри та оновлення головної сторінки
  const handleSaveGame = async () => {
    if (!selectedGame || !user?.id || saving) return;

    setSaving(true);
    setMessage(null);

    try {
      const saved = await onSelectGame(selectedGame, { playStyle, afk });

      if (!saved) {
        return;
      }

      // Повторно завантажуємо профілі з Supabase
      await onSaved();

      // Закриваємо модальне вікно після оновлення
      onClose();
    } catch (error) {
      console.error('Save game callback error:', error);

      setMessage({
        type: 'error',
        text: 'Something went wrong. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Скасування ролі: гравець зникає зі списку
  const handleClearRole = async () => {
    if (!user?.id || clearing || saving) return;

    setClearing(true);
    setMessage(null);

    try {
      const cleared = await onClearRole();

      if (!cleared) return;

      await onSaved();
      onClose();
    } catch (error) {
      console.error('Clear role error:', error);

      setMessage({
        type: 'error',
        text: 'Something went wrong. Please try again.',
      });
    } finally {
      setClearing(false);
    }
  };

  // Надсилання запиту на додавання нової гри
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
  };

  return (
    <div
      className="anim-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div className="anim-sheet w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
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
            disabled={saving}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-40"
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
                  <span className="font-inter text-sm">
                    Loading games...
                  </span>
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
                      disabled={saving}
                      className={`flex items-center gap-2 rounded-xl border p-3 text-left font-inter text-sm font-bold transition-all disabled:opacity-50 ${
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

              {/* Стиль гри та статус */}
              {!loading && games.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="mb-1.5 font-inter text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Play style
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ['chill', 'Chill', Coffee],
                        ['competitive', 'Competitive', Swords],
                      ] as const).map(([value, label, Icon]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPlayStyle(value)}
                          disabled={saving || clearing}
                          className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 font-inter text-sm font-bold disabled:opacity-50 ${
                            playStyle === value
                              ? 'border-green-500 bg-green-500/10 text-green-400'
                              : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 font-inter text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Status
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAfk(false)}
                        disabled={saving || clearing}
                        className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 font-inter text-sm font-bold disabled:opacity-50 ${
                          !afk
                            ? 'border-green-500 bg-green-500/10 text-green-400'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <Zap className="h-4 w-4" />
                        Available
                      </button>

                      <button
                        type="button"
                        onClick={() => setAfk(true)}
                        disabled={saving || clearing}
                        className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 font-inter text-sm font-bold disabled:opacity-50 ${
                          afk
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <Moon className="h-4 w-4" />
                        AFK
                      </button>
                    </div>
                  </div>
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
                  disabled={!selectedGame || loading || saving || clearing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3 font-inter font-bold text-black transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {saving ? 'Saving...' : hasRole ? 'Update role' : 'Save game'}
                </button>

                {hasRole && (
                  <button
                    onClick={handleClearRole}
                    disabled={saving || clearing}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-3 font-inter text-sm font-bold text-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {clearing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Cancel role
                  </button>
                )}

                <button
                  onClick={() => {
                    setRequestMode(true);
                    setMessage(null);
                  }}
                  disabled={saving || clearing}
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
