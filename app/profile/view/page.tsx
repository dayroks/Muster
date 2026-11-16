'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Info, Send, Youtube, Instagram, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRequireAuth } from '@/lib/useRequireAuth';
import FullScreenLoader from '@/components/FullScreenLoader';
import { Banner, AvatarCircle, InfoRow, normalizeLink } from '@/components/ProfileParts';

type OtherProfile = {
  username: string;
  handle: string;
  bio: string;
  telegram: string;
  youtube: string;
  instagram: string;
  avatarUrl: string;
  bannerUrl: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ViewInner() {
  const router = useRouter();
  const id = useSearchParams().get('id') ?? '';
  const { user, checking } = useRequireAuth();

  const [profile, setProfile] = useState<OtherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // свій профіль відкриваємо на звичайній сторінці з редагуванням
    if (id === user.id) {
      router.replace('/profile');
      return;
    }

    if (!UUID_RE.test(id)) {
      setLoading(false);
      return;
    }

    supabase
      .from('profiles')
      .select('username, handle, bio, telegram, youtube, instagram, avatar_url, banner_url')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('Supabase error:', error.message);
        } else if (data) {
          setProfile({
            username: data.username ?? '',
            handle: data.handle ?? '',
            bio: data.bio ?? '',
            telegram: data.telegram ?? '',
            youtube: data.youtube ?? '',
            instagram: data.instagram ?? '',
            avatarUrl: data.avatar_url ?? '',
            bannerUrl: data.banner_url ?? '',
          });
        }
        setLoading(false);
      });
  }, [user, id, router]);

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  if (checking) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center px-4 py-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 font-inter font-bold text-zinc-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md pb-10">
        {loading ? (
          <p className="py-16 text-center font-inter font-medium text-zinc-500">Loading...</p>
        ) : !profile ? (
          <p className="py-16 text-center font-inter font-medium text-zinc-500">
            Profile not found.
          </p>
        ) : (
          <div>
            <Banner url={profile.bannerUrl} />

            <div className="px-4">
              <div className="mx-auto -mt-12 h-24 w-24">
                <AvatarCircle url={profile.avatarUrl} name={profile.username} />
              </div>

              <div className="mt-3 text-center">
                <h2 className="font-onest text-xl font-extrabold tracking-tight text-white">
                  {profile.username || 'Player'}
                </h2>
                {profile.handle && (
                  <p className="font-inter text-sm font-medium text-zinc-500">
                    @{profile.handle}
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <InfoRow
                  Icon={Info}
                  color="text-zinc-400"
                  label="about me"
                  value={profile.bio || 'Nothing here yet'}
                />
                {profile.telegram && (
                  <InfoRow
                    Icon={Send}
                    color="text-sky-400"
                    label="Telegram"
                    value={profile.telegram}
                    href={normalizeLink('telegram', profile.telegram)}
                  />
                )}
                {profile.youtube && (
                  <InfoRow
                    Icon={Youtube}
                    color="text-red-500"
                    label="YouTube"
                    value={profile.youtube}
                    href={normalizeLink('youtube', profile.youtube)}
                  />
                )}
                {profile.instagram && (
                  <InfoRow
                    Icon={Instagram}
                    color="text-pink-500"
                    label="Instagram"
                    value={profile.instagram}
                    href={normalizeLink('instagram', profile.instagram)}
                  />
                )}
              </div>

              <Link
                href={`/chats/chat?id=${id}`}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3.5 font-inter font-bold text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-colors hover:bg-green-400"
              >
                <MessageCircle className="h-5 w-5" />
                Message
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ViewProfilePage() {
  return (
    <Suspense fallback={null}>
      <ViewInner />
    </Suspense>
  );
  }
