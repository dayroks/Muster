import { MessageCircle } from 'lucide-react';
import PageShell from '@/components/PageShell';

export default function ChatsPage() {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
          <MessageCircle className="h-8 w-8 text-zinc-500" />
        </div>
        <h2 className="font-onest text-xl font-extrabold text-white">Chats</h2>
        <p className="font-inter font-medium text-zinc-400">Messenger coming soon.</p>
      </div>
    </PageShell>
  );
}
