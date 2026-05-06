import { createClient, SupabaseClient } from "@supabase/supabase-js";

declare global {
  var __supabaseBrowserClient: SupabaseClient | undefined;
}

export function getBrowserSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  if (!globalThis.__supabaseBrowserClient) {
    globalThis.__supabaseBrowserClient = createClient(url, key);
  }

  return globalThis.__supabaseBrowserClient;
}