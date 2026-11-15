'use client';

import { User, Gamepad2, Circle } from 'lucide-react';

export type Player = {
  id: string;
  nickname: string;
  game: string;
  status: string;
};

export default function PlayerCard({ player }: { player: Player }) {
  const isOnline = player.status?.toLowerCase() === 'online';

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-[#2C2C2C] p-4 text-white">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10">
        <User className="h-7 w-7 text-white/70" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{player.nickname}</p>
        <p className="flex items-center gap-1.5 truncate text-sm text-white/70">
          <Gamepad2 className="h-4 w-4 shrink-0" />
          {player.game}
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-sm">
        <Circle
          className={`h-3 w-3 ${
            isOnline ? 'fill-green-500 text-green-500' : 'fill-gray-500 text-gray-500'
          }`}
        />
        <span className="text-white/80">{player.status}</span>
      </div>
    </div>
  );
}
