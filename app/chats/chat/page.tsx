'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Send, Search, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/lib/useRequireAuth';
import BottomNav from '@/components/BottomNav';
import FullScreenLoader from '@/components/FullScreenLoader';

type Message = {
  id: string | number;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mergeMessages(a: Message[], b: Message[]): Message[] {
  const map = new Map<string | number, Message>();
  [...a, ...b].forEach((m) => map.set(m.id, m));
  return Array.from(map.values()).sort(
    (x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime()
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ChatInner() {
  const peerId = useSearchParams().get('id') ?? '';
  const { user, checking } = useRequireAuth();
  const myId = user?.id ?? '';

  const [peerName, setPeerName] = useState('');
  const [chatPeers, setChatPeers] = useState<Array<{ id: string; username: string; avatar_url: string | null; lastText: string }>>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);

  const idsValid = UUID_RE.test(myId) && UUID_RE.test(peerId) && myId !== peerId;

  // Список діалогів для desktop sidebar (ті самі повідомлення Supabase)
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const loadPeers = async () => {
      const { data } = await supabase.from('messages').select('*')
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
        .order('created_at', { ascending: false }).limit(500);
      if (!alive || !data) return;
      const latest = new Map<string, Message>();
      (data as Message[]).forEach((m) => {
        const id = m.sender_id === myId ? m.receiver_id : m.sender_id;
        if (id !== myId && !latest.has(id)) latest.set(id, m);
      });
      const ids = Array.from(latest.keys());
      if (!ids.length) { setChatPeers([]); return; }
      const { data: people } = await supabase.from('profiles').select('id, username, avatar_url').in('id', ids);
      if (!alive) return;
      const byId = new Map<string, { username: string | null; avatar_url: string | null }>((((people ?? []) as Array<{ id: string; username: string | null; avatar_url: string | null }>).map((p) => [p.id, p])));
      setChatPeers(ids.map((id) => ({ id, username: byId.get(id)?.username || 'Player', avatar_url: byId.get(id)?.avatar_url || null, lastText: latest.get(id)?.content || '' })));
    };
    loadPeers();
    return () => { alive = false; };
  }, [user, myId]);

  // Ім'я співрозмовника
  useEffect(() => {
    if (!user || !UUID_RE.test(peerId)) return;
    supabase
      .from('profiles')
      .select('username')
      .eq('id', peerId)
      .maybeSingle()
      .then(({ data }) => setPeerName(data?.username ?? ''));
  }, [user, peerId]);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => mergeMessages(prev, [msg]));
  }, []);

  // Realtime-підписка
  useEffect(() => {
    if (!idsValid) return;

    const channel = supabase
      .channel(`chat-${myId}-${peerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${myId}` },
        (payload) => {
          const m = payload.new as Message;
          if (m.sender_id === peerId) addMessage(m);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${myId}` },
        (payload) => {
          const m = payload.new as Message;
          if (m.receiver_id === peerId) addMessage(m);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [idsValid, myId, peerId, addMessage]);

  // Історія
  useEffect(() => {
    if (checking) return;
    if (!idsValid) {
      setLoading(false);
      return;
    }

    const loadHistory = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${myId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${myId})`
        )
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Load messages error:', error.message);
        setError('Could not load messages');
      } else {
        setMessages((prev) => mergeMessages((data as Message[]) ?? [], prev));
      }
      setLoading(false);
    };
    loadHistory();
  }, [checking, idsValid, myId, peerId]);

  // Автоскрол
  useEffect(() => {
    if (loading) return;
    bottomRef.current?.scrollIntoView({
      behavior: didInitialScroll.current ? 'smooth' : 'auto',
      block: 'end',
    });
    didInitialScroll.current = true;
  }, [messages, loading]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending || !idsValid) return;

    setSending(true);
    setError('');

    // sender_id має збігатися з auth.uid(), інакше RLS відхилить запис
    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: myId, receiver_id: peerId, content })
      .select()
      .single();

    setSending(false);

    if (error) {
      console.error('Send error:', error.message);
      setError('Message was not sent. Try again.');
      return;
    }

    if (data) addMessage(data as Message);
    setText('');
  };

  if (checking) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-zinc-950 desktop-chat-page">
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 py-4">
          <Link
            href="/chats"
            aria-label="Back"
            className="text-zinc-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="truncate font-onest text-lg font-extrabold text-white">
            Chat with {peerName || '...'}
          </h1>
        </div>
      </header>

      <div className="desktop-chat-workspace">
      <aside className="desktop-chat-sidebar">
        <div className="desktop-chat-sidebar__head"><strong>Messages</strong><span>{chatPeers.length}</span></div>
        <div className="desktop-chat-sidebar__search"><Search className="h-4 w-4"/><span>Search conversations</span></div>
        <div className="desktop-chat-sidebar__items">
          {chatPeers.map((peer) => <Link key={peer.id} href={`/chats/chat?id=${peer.id}`} className={`desktop-chat-peer ${peer.id === peerId ? 'is-current' : ''}`}>
            <div className="desktop-chat-peer__avatar">{peer.avatar_url ? <img src={peer.avatar_url} alt=""/> : peer.username.charAt(0).toUpperCase()}</div>
            <div><b>{peer.username}</b><small>{peer.lastText}</small></div>
          </Link>)}
          {!chatPeers.length && <p className="px-4 py-8 text-center text-sm text-zinc-500">No conversations yet</p>}
        </div>
      </aside>
      <main className="desktop-chat-conversation">
        {loading ? (
          <p className="py-16 text-center font-inter font-medium text-zinc-500">Loading...</p>
        ) : !idsValid ? (
          <p className="py-16 text-center font-inter font-medium text-zinc-500">
            Chat not found.
          </p>
        ) : messages.length === 0 ? (
          <p className="py-16 text-center font-inter font-medium text-zinc-500">
            No messages yet. Say hi!
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => {
              const mine = m.sender_id === myId;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                      mine
                        ? 'rounded-br-md bg-green-500 text-black'
                        : 'rounded-bl-md bg-zinc-800 text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words font-inter text-[15px] font-medium">
                      {m.content}
                    </p>
                    <p
                      className={`mt-0.5 text-right font-inter text-[10px] font-medium ${
                        mine ? 'text-black/60' : 'text-zinc-400'
                      }`}
                    >
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} className="scroll-mb-36" />
      </main>
      </div>

      {idsValid && (
        <div
          className="fixed inset-x-0 z-40 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur-md"
          style={{ bottom: 'calc(7rem + env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto w-full max-w-6xl px-6 py-3">
            {error && (
              <p className="mb-2 font-inter text-xs font-medium text-red-400">{error}</p>
            )}
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                enterKeyHint="send"
                maxLength={2000}
                placeholder="Message..."
                className="min-w-0 flex-1 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2.5 font-inter font-medium text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-green-500"
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                aria-label="Send"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

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
