'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';

const titles: Array<[string, string, string]> = [
  ['/chats', 'Chats', 'Your conversations and mini apps'],
  ['/profile', 'Profile', 'How other players see you'],
  ['/settings', 'Settings', 'Account and preferences'],
  ['/admin', 'Admin', 'Manage games, requests and badges'],
];

export default function Header() {
  const path = usePathname() ?? '/';
  const match = titles.find(([prefix]) => path.startsWith(prefix));
  const title = match?.[1] ?? 'Explore';
  const subtitle = match?.[2] ?? 'Find players looking for a team right now';

  return (
    <header className="muster-header">
      <div className="muster-header__inner">
        <div className="muster-brand">
          <div className="muster-brand__mark">
            <Image src="/muster-logo.png" alt="Muster logo" width={48} height={48} priority />
          </div>
          <div>
            <h1 className="font-onest text-[22px] font-extrabold tracking-tight text-white">Muster</h1>
            <p className="mt-0.5 text-xs font-medium tracking-wide text-slate-500">Find your gaming partners</p>
          </div>
        </div>

        {/* На ПК бренд переїздить у бічне меню, а тут — назва поточної сторінки */}
        <div className="muster-page-title" key={title}>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        <div className="muster-online"><span /> Online community</div>
      </div>
    </header>
  );
}
