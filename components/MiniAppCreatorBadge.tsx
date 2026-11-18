/* eslint-disable @next/next/no-img-element */

// Значок Mini App Creator (показується одразу після галочки, а якщо галочки немає — замість неї)
export function MiniAppCreatorBadge({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <img
      src="/mini-app-creator.png"
      alt="Mini App Creator"
      title="Mini App Creator"
      className={`shrink-0 object-contain ${className}`}
    />
  );
}

// Підпис біля опису профілю
export function MiniAppCreatorNote() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-sky-500/25 bg-sky-500/10 p-3">
      <img src="/mini-app-creator.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
      <p className="font-inter text-sm font-medium leading-snug text-sky-200">
        This person is a <span className="font-bold text-white">Mini App Creator</span>.
      </p>
    </div>
  );
}
