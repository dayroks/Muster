
'use client';

import { StickerCreatorBadge } from '@/components/StickerCreatorBadge';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Gamepad2,
  Check,
  X,
  Plus,
  Trash2,
  Loader2,
  ClipboardList,
  Settings,
  AlertCircle,
  Search,
  Users,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/lib/useRequireAuth';
import PageShell from '@/components/PageShell';
import FullScreenLoader from '@/components/FullScreenLoader';

type Game = {
  id: string;
  name: string;
};

type GameRequest = {
  id: string;
  game_name: string;
  requested_by: string;
  status: string;
};

type AdminProfile = {
  id: string;
  username: string | null;
  handle: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_sticker_creator: boolean;
};

type Tab = 'requests' | 'games' | 'users';

export default function AdminPage() {
  const router = useRouter();
  const { user, checking } = useRequireAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  const [activeTab, setActiveTab] = useState<Tab>('requests');

  const [requests, setRequests] = useState<GameRequest[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [newGame, setNewGame] = useState('');
  const [addingGame, setAddingGame] = useState(false);

  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    if (checking) return;

    if (!user) {
      setCheckingRole(false);
      return;
    }

    let active = true;

    const checkAdmin = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!active) return;

      if (error || data?.role !== 'admin') {
        router.push('/');
        return;
      }

      setIsAdmin(true);
      setCheckingRole(false);
    };

    checkAdmin();

    return () => {
      active = false;
    };
  }, [user, checking, router]);

  const loadData = async () => {
    setLoading(true);

    const [requestsResult, gamesResult, usersResult] = await Promise.all([
      supabase
        .from('game_requests')
        .select('id, game_name, requested_by, status')
        .eq('status', 'pending')
        .order('id', { ascending: false }),

      supabase
        .from('games')
        .select('id, name')
        .order('name', { ascending: true }),

      supabase
        .from('profiles')
        .select('id, username, handle, avatar_url, is_verified, is_sticker_creator')
        .order('username', { ascending: true }),
    ]);

    if (requestsResult.error || gamesResult.error || usersResult.error) {
      console.error(
        'Admin data error:',
        requestsResult.error || gamesResult.error || usersResult.error
      );

      setMessage({
        text: 'Could not load admin data.',
        type: 'error',
      });
    } else {
      setRequests((requestsResult.data as GameRequest[]) ?? []);
      setGames((gamesResult.data as Game[]) ?? []);
      setUsers((usersResult.data as AdminProfile[]) ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const showMessage = (
    text: string,
    type: 'success' | 'error'
  ) => {
    setMessage({ text, type });
  };

  const handleApprove = async (request: GameRequest) => {
    setProcessingId(request.id);
    setMessage(null);

    // Спочатку додаємо гру.
    const { error: insertError } = await supabase
      .from('games')
      .insert({
        name: request.game_name.trim(),
      });

    if (insertError) {
      console.error('Game insert error:', insertError);

      showMessage(
        'Could not add the game. The request was not deleted.',
        'error'
      );

      setProcessingId(null);
      return;
    }

    // Видаляємо заявку тільки після успішного додавання.
    const { error: deleteError } = await supabase
      .from('game_requests')
      .delete()
      .eq('id', request.id);

    if (deleteError) {
      console.error('Request delete error:', deleteError);

      showMessage(
        'Game added, but the request could not be deleted. Please refresh.',
        'error'
      );

      await loadData();
      setProcessingId(null);
      return;
    }

    setRequests((prev) => prev.filter((r) => r.id !== request.id));

    setGames((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: request.game_name.trim(),
      },
    ]);

    showMessage('Game approved successfully!', 'success');
    setProcessingId(null);
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    setMessage(null);

    const { error } = await supabase
      .from('game_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      console.error('Reject error:', error);
      showMessage('Could not reject this request.', 'error');
    } else {
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      showMessage('Request rejected.', 'success');
    }

    setProcessingId(null);
  };

  const handleAddGame = async () => {
    const name = newGame.trim();

    if (!name) return;

    setAddingGame(true);
    setMessage(null);

    const { data, error } = await supabase
      .from('games')
      .insert({ name })
      .select('id, name')
      .single();

    if (error) {
      console.error('Add game error:', error);
      showMessage('Could not add this game.', 'error');
    } else {
      setGames((prev) => [...prev, data].sort((a, b) =>
        a.name.localeCompare(b.name)
      ));
      setNewGame('');
      showMessage('Game added successfully!', 'success');
    }

    setAddingGame(false);
  };

  const handleDeleteGame = async (gameId: string) => {
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId);

    if (error) {
      console.error('Delete game error:', error);
      showMessage('Could not delete this game.', 'error');
      return;
    }

    setGames((prev) => prev.filter((game) => game.id !== gameId));
    showMessage('Game deleted.', 'success');
  };

  const handleToggleVerification = async (profile: AdminProfile) => {
    const nextValue = !profile.is_verified;
    setProcessingId(profile.id);
    setMessage(null);

    const { data, error } = await supabase
      .from('profiles')
      .update({ is_verified: nextValue })
      .eq('id', profile.id)
      .select('id');

    if (!error && (!data || data.length === 0)) {
      showMessage('Update blocked (check RLS policy).', 'error');
      setProcessingId(null);
      return;
    }

    if (error) {
      console.error('Verification update error:', error);
      showMessage(
        error.message || 'Could not update verification status.',
        'error'
      );
    } else {
      setUsers((prev) =>
        prev.map((item) =>
          item.id === profile.id
            ? { ...item, is_verified: nextValue }
            : item
        )
      );
      showMessage(
        nextValue ? 'Verification badge granted.' : 'Verification badge removed.',
        'success'
      );
    }

    setProcessingId(null);
  };

  const handleToggleStickerCreator = async (profile: AdminProfile) => {
    const nextValue = !profile.is_sticker_creator;
    setProcessingId(`sc-${profile.id}`);
    setMessage(null);

    const { data, error } = await supabase
      .from('profiles')
      .update({ is_sticker_creator: nextValue })
      .eq('id', profile.id)
      .select('id');

    if (error) {
      console.error('Sticker creator update error:', error);
      showMessage(error.message || 'Could not update Sticker Creator status.', 'error');
    } else if (!data || data.length === 0) {
      showMessage('Update blocked (check RLS policy).', 'error');
    } else {
      setUsers((prev) =>
        prev.map((item) =>
          item.id === profile.id ? { ...item, is_sticker_creator: nextValue } : item
        )
      );
      showMessage(
        nextValue ? 'Sticker Creator badge granted.' : 'Sticker Creator badge removed.',
        'success'
      );
    }

    setProcessingId(null);
  };

  const filteredUsers = users.filter((profile) => {
    const q = userSearch.trim().toLowerCase().replace(/^@/, '');
    if (!q) return true;
    return (
      (profile.username ?? '').toLowerCase().includes(q) ||
      (profile.handle ?? '').toLowerCase().includes(q)
    );
  });

  if (checking || checkingRole || (!isAdmin && user)) {
    return <FullScreenLoader />;
  }

  if (!user || !isAdmin) {
    return <FullScreenLoader />;
  }

  return (
    <PageShell>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-green-500/30 bg-green-500/10">
          <ShieldCheck className="h-6 w-6 text-green-400" />
        </div>

        <div>
          <h1 className="font-onest text-2xl font-extrabold tracking-tight text-white">
            Admin Dashboard
          </h1>
          <p className="font-inter text-sm text-zinc-500">
            Manage games and requests
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 grid grid-cols-3 gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center justify-center gap-2 rounded-lg py-3 font-inter text-sm font-bold transition-all ${
            activeTab === 'requests'
              ? 'bg-green-500 text-black'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Requests
          {requests.length > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                activeTab === 'requests'
                  ? 'bg-black/15 text-black'
                  : 'bg-zinc-800 text-green-400'
              }`}
            >
              {requests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('games')}
          className={`flex items-center justify-center gap-2 rounded-lg py-3 font-inter text-sm font-bold transition-all ${
            activeTab === 'games'
              ? 'bg-green-500 text-black'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Settings className="h-4 w-4" />
          Manage Games
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center justify-center gap-2 rounded-lg py-3 font-inter text-sm font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-green-500 text-black'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          Manage Users
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-xl border p-3 font-inter text-sm font-semibold ${
            message.type === 'success'
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-green-500" />
        </div>
      ) : (
        <>
          {/* REQUESTS */}
          {activeTab === 'requests' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-onest text-lg font-extrabold text-white">
                  Pending Requests
                </h2>

                <span className="font-inter text-xs font-bold text-zinc-500">
                  {requests.length} requests
                </span>
              </div>

              {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 py-12 text-center">
                  <ClipboardList className="mb-3 h-10 w-10 text-zinc-600" />
                  <p className="font-inter text-sm font-semibold text-zinc-400">
                    No pending requests
                  </p>
                  <p className="mt-1 font-inter text-xs text-zinc-600">
                    New game requests will appear here.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800">
                          <Gamepad2 className="h-5 w-5 text-green-400" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="break-words font-inter font-bold text-white">
                            {request.game_name}
                          </h3>
                          <p className="font-inter text-xs text-zinc-500">
                            Pending approval
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleApprove(request)}
                          disabled={processingId === request.id}
                          className="flex items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 font-inter text-sm font-bold text-black transition-colors hover:bg-green-400 disabled:opacity-50"
                        >
                          {processingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Approve
                        </button>

                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id}
                          className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 font-inter text-sm font-bold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MANAGE GAMES */}
          {activeTab === 'games' && (
            <div>
              <h2 className="mb-4 font-onest text-lg font-extrabold text-white">
                Manage Games
              </h2>

              <div className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <label className="mb-2 block font-inter text-sm font-bold text-white">
                  Add a new game
                </label>

                <div className="flex gap-2">
                  <input
                    value={newGame}
                    onChange={(e) => setNewGame(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddGame();
                    }}
                    placeholder="Game name..."
                    maxLength={100}
                    className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 font-inter text-sm text-white outline-none placeholder:text-zinc-600 focus:border-green-500"
                  />

                  <button
                    onClick={handleAddGame}
                    disabled={!newGame.trim() || addingGame}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-green-500 px-4 font-inter text-sm font-bold text-black transition-colors hover:bg-green-400 disabled:opacity-50"
                  >
                    {addingGame ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add
                  </button>
                </div>
              </div>

              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-inter text-sm font-bold text-zinc-300">
                  All Games
                </h3>
                <span className="font-inter text-xs font-bold text-zinc-500">
                  {games.length} games
                </span>
              </div>

              {games.length === 0 ? (
                <p className="py-10 text-center font-inter text-sm text-zinc-500">
                  No games added yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {games.map((game) => (
                    <div
                      key={game.id}
                      className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                        <Gamepad2 className="h-5 w-5 text-green-400" />
                      </div>

                      <span className="min-w-0 flex-1 break-words font-inter text-sm font-bold text-white">
                        {game.name}
                      </span>

                      <button
                        onClick={() => handleDeleteGame(game.id)}
                        aria-label={`Delete ${game.name}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MANAGE USERS */}
          {activeTab === 'users' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-onest text-lg font-extrabold text-white">
                  Manage Users
                </h2>
                <span className="font-inter text-xs font-bold text-zinc-500">
                  {users.length} users
                </span>
              </div>

              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <input
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search by nickname or @username..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-3 font-inter text-sm text-white outline-none placeholder:text-zinc-500 focus:border-green-500"
                />
              </div>

              <div className="mb-3 flex items-center justify-between">
                <p className="font-inter text-sm font-bold text-zinc-300">
                  All users
                </p>
                <span className="font-inter text-xs text-zinc-500">
                  {filteredUsers.length} found
                </span>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-10 text-center font-inter text-sm text-zinc-500">
                  No users found.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredUsers.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800">
                        {profile.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="font-onest font-bold text-zinc-300">
                            {(profile.username || 'P').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {profile.is_sticker_creator === true && (
                            <StickerCreatorBadge className="h-4 w-4" />
                          )}
                          <span className="truncate font-inter text-sm font-bold text-white">
                            {profile.username || 'Player'}
                          </span>
                          {profile.is_verified === true && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src="/galka.png"
                              alt="Verified"
                              className="h-4 w-4 shrink-0 object-contain"
                            />
                          )}
                        </div>
                        <p className="truncate font-inter text-xs text-zinc-500">
                          {profile.handle ? `@${profile.handle}` : 'No username'}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col gap-1.5">
                      <button
                        onClick={() => handleToggleVerification(profile)}
                        disabled={processingId === profile.id}
                        className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-inter text-xs font-bold transition-colors disabled:opacity-50 ${
                          profile.is_verified
                            ? 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : 'bg-green-500 text-black hover:bg-green-400'
                        }`}
                      >
                        {processingId === profile.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : profile.is_verified ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        {profile.is_verified ? 'Remove Badge' : 'Give Badge'}
                      </button>

                      <button
                        onClick={() => handleToggleStickerCreator(profile)}
                        disabled={processingId === `sc-${profile.id}`}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-inter text-xs font-bold disabled:opacity-50 ${
                          profile.is_sticker_creator
                            ? 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : 'bg-violet-500 text-white hover:bg-violet-400'
                        }`}
                      >
                        {processingId === `sc-${profile.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src="/sticker-creator.png" alt="" className="h-4 w-4 object-contain" />
                        )}
                        {profile.is_sticker_creator ? 'Remove Creator' : 'Sticker Creator'}
                      </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </PageShell>
  );
    }
