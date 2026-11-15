'use client';

import { Home, UserPlus, User, Settings } from 'lucide-react';

const items = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'find', label: 'Find Players', Icon: UserPlus },
  { id: 'profile', label: 'Profile', Icon: User },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

export default function BottomNav({ active = 'find' }: { active?: string }) {
  return (
    <nav className="fixed bottom-0 w-full bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 pb-[env(safe-area-inset-bottom)] z-50">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-3">
        {items.map(({ id, label, Icon }) => (
          <button
            key={id}
            aria-label={label}
            className={`p-2 transition-colors ${
              active === id ? 'text-green-500' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Icon className="h-6 w-6" />
          </button>
        ))}
      </div>
    </nav>
  );
}
