'use client';

import Image from 'next/image';
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

  const activeIndex = items.findIndex(
    ({ href }) => pathname === href || (href === '/chats' && pathname.startsWith('/chats/'))
  );

  return (
    <nav className="muster-glass-nav" aria-label="Main navigation">
      {/* Логотип показується лише в бічному меню на ПК */}
      <Link href="/" className="muster-nav-brand" aria-label="Muster">
        <span className="muster-nav-brand__mark">
          <Image src="/muster-logo.png" alt="" width={40} height={40} />
        </span>
        <span className="muster-nav-brand__text">
          <b>Muster</b>
          <small>Find your gaming partners</small>
        </span>
      </Link>

      <div
        className="muster-glass-nav__inner"
        style={{ ['--idx' as string]: Math.max(activeIndex, 0) } as React.CSSProperties}
      >
        {/* Ковзна підсвітка активного пункту */}
        {activeIndex >= 0 && <span className="muster-glass-nav__pill" aria-hidden="true" />}

        {items.map(({ href, label, Icon }, i) => {
          const active = i === activeIndex;
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
