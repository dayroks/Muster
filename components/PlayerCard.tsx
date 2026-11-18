'use client';

import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';

export type Player = {
  id: string;
  nickname: string;
  handle?: string;
  avatarUrl?: string;
  game?: string;
  status?: string;
  is_verified?: boolean;
};

export default function PlayerCard({ player }: { player: Player }) {
  const name = player.nickname || 'Player';
  const isOnline = player.status?.toLowerCase() === 'online';

  return (
    <div className="relative flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-all hover:border-zinc-700 active:bg-zinc-800/60">
      {/* Клік по будь-якому місцю картки відкриває чат */}
      <Link
        href={`/chats/chat?id=${player.id}`}
        aria-label={`Chat with ${name}`}
        className="absolute inset-0 rounded-xl"
      />

      {/* Клік по аватарці відкриває профіль */}
      <Link
        href={`/profile/view?id=${player.id}`}
        aria-label={`Open ${name}'s profile`}
        className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-500 transition-transform active:scale-95"
      >
        {player.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="font-onest text-lg font-extrabold text-black">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </Link>

      {/* Текст пропускає кліки до посилання на чат */}
      <div className="pointer-events-none relative min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-0.5 truncate font-inter font-bold text-white">
          <span className="truncate">{name}</span>
          {player.is_verified === true && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/galka.png"
              alt="Verified"
              title="Verified"
              className="h-7 w-7 shrink-0 object-contain"
            />
          )}
        </p>
        <p className="truncate font-inter text-sm font-medium text-zinc-400">
          {player.handle ? `@${player.handle}` : 'No username yet'}
        </p>
        {player.game && (
          <p className="mt-0.5 flex items-center gap-1.5 truncate font-inter text-xs font-medium text-zinc-500">
            <Gamepad2 className="h-3.5 w-3.5 shrink-0" />
            {player.game}
          </p>
        )}
      </div>

      {player.status && (
        <div className="pointer-events-none relative flex items-center gap-2 font-inter text-xs font-medium text-zinc-400">
          <span
            className={`h-2 w-2 rounded-full ${
              isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-600'
            }`}
          />
          {player.status}
        </div>
      )}
    </div>
  );
}
