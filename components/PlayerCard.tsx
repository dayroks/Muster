'use client';

import { User, Gamepad2 } from 'lucide-react';

export type Player = {
  id: string;
  nickname: string;
  game: string;
  status: string;
};

export default function PlayerCard({ player }: { player: Player }) {
  const isOnline = player.status?.toLowerCase() === 'online';

  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-all hover:border-zinc-700">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-800">
        <User className="h-6 w-6 text-zinc-400" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-inter font-bold text-white">{player.nickname}</p>
        <p className="flex items-center gap-1.5 truncate font-inter text-sm font-medium text-zinc-400">
          <Gamepad2 className="h-4 w-4 shrink-0" />
          {player.game}
        </p>
      </div>

      <div className="flex items-center gap-2 font-inter text-xs font-medium text-zinc-400">
        <span
          className={`h-2 w-2 rounded-full ${
            isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-600'
          }`}
        />
        {player.status}
      </div>
    </div>
  );
}
