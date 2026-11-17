import Header from './Header';
import BottomNav from './BottomNav';

export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="muster-app-shell">
      <Header />
      <main className="muster-page-content">{children}</main>
      <BottomNav />
    </div>
  );
}
