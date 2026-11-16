'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

function ChatInner() {
  const id = useSearchParams().get('id');
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (!id) return;
    supabase
      .from('profiles')
      .select('username')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => setUsername(data?.username ?? ''));
  }, [id]);

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-4">
          <Link
            href="/chats"
            aria-label="Back"
            className="text-zinc-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="truncate font-onest text-lg font-extrabold text-white">
            Chat with {username || '...'}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-28 pt-8">
        <p className="text-center font-inter font-medium text-zinc-500">
          Messages will appear here.
        </p>
      </main>

      <BottomNav />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatInner />
    </Suspense>
  );
}
