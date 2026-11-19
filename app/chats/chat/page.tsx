'use client';

import { StickerCreatorBadge } from '@/components/StickerCreatorBadge';
import { MiniAppCreatorBadge } from '@/components/MiniAppCreatorBadge';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, Search, MessageCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/lib/useRequireAuth';
import BottomNav from '@/components/BottomNav';
import FullScreenLoader from '@/components/FullScreenLoader';
import MentionText from '@/components/MentionText';

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

  const [peerInfo, setPeerInfo] = useState<{ username: string; handle: string | null; avatar_url: string | null; is_verified: boolean; is_sticker_creator: boolean; is_mini_app_creator: boolean } | null>(null);
  const [chatPeers, setChatPeers] = useState<Array<{ id: string; username: string; avatar_url: string | null; lastText: string }>>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [chatSearch, setChatSearch] = useState('');

  const router = useRouter();
  const [mentionToast, setMentionToast] = useState('');
  const mentionToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMentionToast = (msg: string) => {
    setMentionToast(msg);
    if (mentionToastTimer.current) clearTimeout(mentionToastTimer.current);
    mentionToastTimer.current = setTimeout(() => setMentionToast(''), 2500);
  };

  useEffect(() => {
    return () => {
      if (mentionToastTimer.current) clearTimeout(mentionToastTimer.current);
    };
  }, []);

  // Клік по @юзернейму: шукаємо профіль, якщо є — відкриваємо, якщо ні — повідомлення
  const openMention = async (handle: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('handle', handle.toLowerCase())
      .maybeSingle();

    if (error || !data?.id) {
      showMentionToast('No profile found');
      return;
    }
    router.push(`/profile/view?id=${data.id}`);
  };

  // Розбиває текст повідомлення і робить із @юзернеймів синні клікабельні посилання
  const renderContent = (content: string, mine: boolean) => {
    const parts: React.ReactNode[] = [];
    const re = /(^|[^A-Za-z0-9_])@([A-Za-z0-9_]+)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const start = m.index + m[1].length; // позиція символу @
      if (start > last) parts.push(content.slice(last, start));
      const handle = m[2];
      parts.push(
        <button
          key={`${start}-${handle}`}
          type="button"
          onClick={() => openMention(handle)}
          className={`cursor-pointer font-bold underline-offset-2 hover:underline ${
            mine ? 'text-blue-800' : 'text-sky-400'
          }`}
        >
          @{handle}
        </button>
      );
      last = start + 1 + handle.length;
    }
    if (last < content.length) parts.push(content.slice(last));
    return parts;
  };

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const idsValid = UUID_RE.test(myId) && UUID_RE.test(peerId) && myId !== peerId;

  // На ПК одразу ставимо курсор у поле вводу (на телефоні не чіпаємо, щоб не вискакувала клавіатура)
  useEffect(() => {
    if (loading || !idsValid) return;
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [loading, idsValid, peerId]);
  const didInitialScroll = useRef(false);

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
      .select('username, handle, avatar_url, is_verified, is_sticker_creator, is_mini_app_creator')
      .eq('id', peerId)
      .maybeSingle()
      .then(({ data }) =>
        setPeerInfo(
          data
            ? {
                username: data.username || 'Player',
                handle: data.handle ?? null,
                avatar_url: data.avatar_url ?? null,
                is_verified: data.is_verified === true,
                is_sticker_creator: data.is_sticker_creator === true,
                is_mini_app_creator: data.is_mini_app_creator === true,
              }
            : null,
        ),
      );
  }, [user, peerId]);

  // Keep the opened conversation visible in the sidebar, including brand-new chats.
  useEffect(() => {
    if (!idsValid || !peerInfo) return;
    setChatPeers((prev) => {
      const existing = prev.find((peer) => peer.id === peerId);
      const selected = {
        id: peerId,
        username: peerInfo.username || 'Player',
        avatar_url: peerInfo.avatar_url,
        lastText: existing?.lastText || '',
      };
      return [selected, ...prev.filter((peer) => peer.id !== peerId)];
    });
  }, [idsValid, peerId, peerInfo]);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => mergeMessages(prev, [msg]));
    const otherId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;
    setChatPeers((prev) => {
      const existing = prev.find((peer) => peer.id === otherId);
      if (!existing && otherId !== peerId) return prev;
      const updated = existing
        ? { ...existing, lastText: msg.content }
        : { id: peerId, username: peerInfo?.username || 'Player', avatar_url: peerInfo?.avatar_url || null, lastText: msg.content };
      return [updated, ...prev.filter((peer) => peer.id !== otherId)];
    });
  }, [myId, peerId, peerInfo]);

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
    const scrollDown = (behavior: ScrollBehavior) =>
      bottomRef.current?.scrollIntoView({ behavior, block: 'end' });

    scrollDown(didInitialScroll.current ? 'smooth' : 'auto');
    didInitialScroll.current = true;

    // Довгі повідомлення дорівнюють висоті не одразу (анімація, перенесення рядків),
    // тому після короткої паузи прокручуємо ще раз миттєво, вже до справжнього низу.
    const t1 = setTimeout(() => scrollDown('auto'), 350);
    const t2 = setTimeout(() => scrollDown('auto'), 700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
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
      <div className="desktop-chat-workspace">
      <aside className="desktop-chat-sidebar">
        <div className="desktop-chat-sidebar__head"><strong>Messages</strong><span>{chatPeers.length}</span></div>
        <label className="desktop-chat-sidebar__search">
          <Search className="h-4 w-4" />
          <input value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
        </label>
        <div className="desktop-chat-sidebar__items">
          {chatPeers.filter((peer) => peer.username.toLowerCase().includes(chatSearch.trim().toLowerCase())).map((peer) => <Link key={peer.id} href={`/chats/chat?id=${peer.id}`} className={`desktop-chat-peer ${peer.id === peerId ? 'is-current' : ''}`}>
            <div className="desktop-chat-peer__avatar">{peer.avatar_url ? <img src={peer.avatar_url} alt=""/> : peer.username.charAt(0).toUpperCase()}</div>
            <div><b>{peer.username}</b><small><MentionText text={peer.lastText} /></small></div>
          </Link>)}
          {!chatPeers.length && <p className="px-4 py-8 text-center text-sm text-zinc-500">No conversations yet</p>}
          {!!chatPeers.length && !chatPeers.some((peer) => peer.username.toLowerCase().includes(chatSearch.trim().toLowerCase())) && <p className="px-4 py-8 text-center text-sm text-zinc-500">No matching conversations</p>}
        </div>
      </aside>
      <section className="desktop-chat-panel">
      <Link href={`/profile/view?id=${peerId}`} className="desktop-chat-peer-header">
        <div className="desktop-chat-peer-header__avatar">
          {peerInfo?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={peerInfo.avatar_url} alt="" />
          ) : (
            <span>{(peerInfo?.username || '?').charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="flex min-w-0 items-center gap-1 font-onest text-lg font-extrabold leading-tight text-white">
            {peerInfo?.is_sticker_creator && <StickerCreatorBadge className="h-5 w-5" />}
            <span className="truncate">{peerInfo?.username || '...'}</span>
            {peerInfo?.is_verified && <img src="/galka.png" alt="Verified" title="Verified" className="h-5 w-5 shrink-0 object-contain" />}
            {peerInfo?.is_mini_app_creator && <MiniAppCreatorBadge className="h-5 w-5" />}
          </h1>
          {peerInfo?.handle && <p className="truncate font-inter text-xs font-medium text-zinc-500">@{peerInfo.handle}</p>}
        </div>
      </Link>
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
                <div key={m.id} className={`msg-in flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                      mine
                        ? 'rounded-br-md bg-green-500 text-black'
                        : 'rounded-bl-md bg-zinc-800 text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words font-inter text-[15px] font-medium">
                      {renderContent(m.content, mine)}
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
        <div ref={bottomRef} className="chat-bottom-anchor" />
      </main>

      {idsValid && (
        <div className="chat-composer">
          <div className="chat-composer__inner">
            {error && (
              <p className="mb-2 font-inter text-xs font-medium text-red-400">{error}</p>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
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

      </section>
      </div>

      {mentionToast && (
        <div
          className="chat-toast toast-in fixed left-1/2 z-50 flex items-center gap-2 whitespace-nowrap rounded-xl border border-red-500/30 bg-zinc-900 px-4 py-3 font-inter font-bold text-red-400"
        >
          <AlertCircle className="h-5 w-5" />
          {mentionToast}
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
