import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Set them in .env.local and in Cloudflare Pages (they are inlined at build time).'
  );
}

// Єдиний екземпляр клієнта на весь застосунок
// (захист від дублювання при hot reload у dev-режимі)
const globalForSupabase = globalThis as unknown as {
  __musterSupabase?: SupabaseClient;
};

export const supabase: SupabaseClient =
  globalForSupabase.__musterSupabase ??
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.__musterSupabase = supabase;
}
