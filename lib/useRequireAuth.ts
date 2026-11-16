'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export function useRequireAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    // getSession() чекає на ініціалізацію клієнта (відновлення сесії з
    // localStorage або з URL після Google) і не робить мережевий запит,
    // тому короткий збій мережі не викидає користувача на /auth/login.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        setUser(data.session.user);
        setChecking(false);
      } else {
        router.replace('/auth/login');
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') {
        router.replace('/auth/login');
      } else if (session) {
        // не міняємо об'єкт user, якщо це той самий користувач
        // (наприклад, при оновленні токена), щоб не перезапускати запити
        setUser((prev) => (prev?.id === session.user.id ? prev : session.user));
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return { user, checking };
}
