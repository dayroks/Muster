import { Settings } from 'lucide-react';
import PageShell from '@/components/PageShell';

export default function SettingsPage() {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
          <Settings className="h-8 w-8 text-zinc-500" />
        </div>
        <h2 className="font-onest text-xl font-extrabold text-white">Settings</h2>
        <p className="font-inter font-medium text-zinc-400">Settings will be here.</p>
      </div>
    </PageShell>
  );
}
