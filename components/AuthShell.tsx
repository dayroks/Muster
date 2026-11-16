import { Users } from 'lucide-react';

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
            <Users className="h-6 w-6 text-black" />
          </div>
          <span className="font-onest text-3xl font-extrabold tracking-tight text-white">
            Muster
          </span>
        </div>

        <h1 className="text-center font-onest text-2xl font-extrabold text-white">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-center font-inter text-sm font-medium text-zinc-500">
            {subtitle}
          </p>
        )}

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
