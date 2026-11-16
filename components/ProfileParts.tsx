import type { ComponentType } from 'react';
import { User } from 'lucide-react';

export function normalizeLink(kind: 'telegram' | 'youtube' | 'instagram', raw: string) {
  const v = raw.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (kind === 'telegram') {
    if (v.startsWith('t.me/')) return `https://${v}`;
    return `https://t.me/${v.replace(/^@/, '')}`;
  }
  if (kind === 'youtube') {
    if (v.startsWith('@')) return `https://youtube.com/${v}`;
    return `https://${v}`;
  }
  if (v.startsWith('@')) return `https://instagram.com/${v.slice(1)}`;
  return `https://${v}`;
}

export function Banner({ url }: { url: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Banner" className="h-32 w-full object-cover" />
  ) : (
    <div className="h-32 w-full bg-gradient-to-r from-zinc-800 to-zinc-900" />
  );
}

export function AvatarCircle({ url, name }: { url: string; name: string }) {
  return (
    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-green-500 bg-zinc-900 shadow-[0_0_25px_rgba(34,197,94,0.25)]">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Avatar" className="h-full w-full object-cover" />
      ) : name ? (
        <span className="font-onest text-4xl font-extrabold text-white">
          {name.charAt(0).toUpperCase()}
        </span>
      ) : (
        <User className="h-10 w-10 text-zinc-500" />
      )}
    </div>
  );
}

export function InfoRow({
  Icon,
  color,
  label,
  value,
  href,
}: {
  Icon: ComponentType<{ className?: string }>;
  color: string;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <Icon className={`h-5 w-5 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <p className="break-words font-inter text-sm font-medium text-white">{value}</p>
        <p className="font-inter text-xs font-bold text-zinc-500">{label}</p>
      </div>
    </>
  );

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 transition-opacity hover:opacity-80"
    >
      {content}
    </a>
  ) : (
    <div className="flex items-center gap-3">{content}</div>
  );
      }
