/* eslint-disable @next/next/no-img-element */

// Значок програми Sticker Creators (показується зліва від ніка)
export function StickerCreatorBadge({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <img
      src="/sticker-creator.png"
      alt="Sticker Creator"
      title="Sticker Creator"
      className={`shrink-0 object-contain ${className}`}
    />
  );
}

// Підпис біля опису профілю
export function StickerCreatorNote() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-violet-500/25 bg-violet-500/10 p-3">
      <img src="/sticker-creator.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
      <p className="font-inter text-sm font-medium leading-snug text-violet-200">
        This person is part of the <span className="font-bold text-white">Sticker Creators</span> program.
      </p>
    </div>
  );
}
