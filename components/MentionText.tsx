'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type MentionTextProps = {
  text: string;
  className?: string;
  mentionClassName?: string;
};

/** Рендерить @username як посилання на профіль у будь-якому тексті. */
export default function MentionText({
  text,
  className = '',
  mentionClassName = 'text-sky-400 hover:text-blue-300',
}: MentionTextProps) {
  const router = useRouter();
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMention = async (handle: string) => {
    const normalized = handle.toLowerCase();
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('handle', normalized)
      .maybeSingle();

    if (error || !data?.id) {
      setToast('No profile found');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(''), 2500);
      return;
    }

    router.push(`/profile/view?id=${data.id}`);
  };

  const parts: React.ReactNode[] = [];
  const mentionRegex = /(^|[^A-Za-z0-9_])@([A-Za-z0-9_]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(text)) !== null) {
    const start = match.index + match[1].length;
    if (start > lastIndex) parts.push(text.slice(lastIndex, start));

    const handle = match[2];
    parts.push(
      <button
        key={`${start}-${handle}`}
        type="button"
        className={`inline cursor-pointer font-semibold underline-offset-2 hover:underline ${mentionClassName}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void openMention(handle);
        }}
      >
        @{handle}
      </button>
    );
    lastIndex = start + handle.length + 1;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return (
    <>
      <span className={className}>{parts.length ? parts : text}</span>
      {toast && (
        <div className="toast-in fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 whitespace-nowrap rounded-xl border border-red-500/30 bg-zinc-900 px-4 py-3 font-inter text-sm font-bold text-red-400 shadow-2xl">
          {toast}
        </div>
      )}
    </>
  );
}
