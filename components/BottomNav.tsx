'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, User, Settings } from 'lucide-react';

const items = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/chats', label: 'Chats', Icon: MessageCircle },
  { href: '/profile', label: 'Profile', Icon: User },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

export default function BottomNav() {
  const rawPath = usePathname() ?? '/';
  // при статичному експорті шлях може мати кінцевий слеш (/chats/)
  const pathname = rawPath.length > 1 ? rawPath.replace(/\/$/, '') : rawPath;

  return (
    <nav className="fixed bottom-0 z-50 w-full border-t border-zinc-800 bg-zinc-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-3">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`p-2 transition-colors ${
                active ? 'text-green-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="h-6 w-6" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
