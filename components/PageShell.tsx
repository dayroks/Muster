import Header from './Header';
import BottomNav from './BottomNav';

export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />
      <main className="mx-auto max-w-md px-4 pb-28 pt-6">{children}</main>
      <BottomNav />
    </div>
  );
}
