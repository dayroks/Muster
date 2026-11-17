'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, UserRound, Settings } from 'lucide-react';

const items = [
  { href: '/', label: 'Explore', Icon: Home },
  { href: '/chats', label: 'Chats', Icon: MessageCircle },
  { href: '/profile', label: 'Profile', Icon: UserRound },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

export default function BottomNav() {
  const rawPath = usePathname() ?? '/';
  const pathname = rawPath.length > 1 ? rawPath.replace(/\/$/, '') : rawPath;

  return (
    <nav className="floating-nav" aria-label="Main navigation">
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href || (href === '/chats' && pathname.startsWith('/chats/'));
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={`floating-nav-item ${active ? 'is-active' : ''}`}
          >
            <span className="floating-nav-icon"><Icon size={20} strokeWidth={2.1} /></span>
            <span className="floating-nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
