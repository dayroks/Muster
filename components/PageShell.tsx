import Header from './Header';
import BottomNav from './BottomNav';

export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Header />
      <main className="page-content">{children}</main>
      <BottomNav />
    </div>
  );
}
