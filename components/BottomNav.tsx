'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, User, Settings } from 'lucide-react';

const items = [
  { href: '/', label: 'Explore', Icon: Home },
  { href: '/chats', label: 'Chats', Icon: MessageCircle },
  { href: '/profile', label: 'Profile', Icon: User },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

export default function BottomNav() {
  const rawPath = usePathname() ?? '/';
  const pathname = rawPath.length > 1 ? rawPath.replace(/\/$/, '') : rawPath;

  return (
    <nav className="muster-glass-nav" aria-label="Main navigation">
      <div className="muster-glass-nav__inner">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || (href === '/chats' && pathname.startsWith('/chats/'));
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`muster-glass-nav__item ${active ? 'is-active' : ''}`}
            >
              <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.2 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
