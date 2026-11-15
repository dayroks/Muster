import { Users } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
          <Users className="h-5 w-5 text-black" />
        </div>
        <h1 className="font-onest text-2xl font-extrabold tracking-tight text-white">
          Muster
        </h1>
      </div>
    </header>
  );
}
