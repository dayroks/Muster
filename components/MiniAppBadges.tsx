import { AppWindow } from 'lucide-react';

// Значок "Mini App Creator" (показується зліва від ніка)
export function MiniAppCreatorBadge({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <span
      title="Mini App Creator"
      aria-label="Mini App Creator"
      className={`badge-pop inline-flex shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-[0_0_10px_rgba(34,211,238,0.35)] ${className}`}
    >
      <AppWindow className="h-[68%] w-[68%]" strokeWidth={2.5} />
    </span>
  );
}

// Підпис біля опису профілю
export function MiniAppCreatorNote() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-cyan-500/25 bg-cyan-500/10 p-3">
      <MiniAppCreatorBadge className="h-8 w-8" />
      <p className="font-inter text-sm font-medium leading-snug text-cyan-100">
        This person is a <span className="font-bold text-white">Mini App Creator</span> and can publish mini apps in Muster.
      </p>
    </div>
  );
}
