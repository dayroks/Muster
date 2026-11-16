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
        <div className="mx-auto flex max-w-md items-center px-4 py-4">
          <Link
            href="/chats"
            className="flex items-center gap-2 font-inter font-bold text-zinc-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 pb-28 pt-8">
        <h2 className="font-onest text-2xl font-extrabold text-white">
          Chat with {username || '...'}
        </h2>
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
