import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * `isCloudEnabled` is true ONLY when both env vars are set at build/dev time.
 * The whole app gracefully degrades to local-only mode when this is false:
 *   • no auth gate
 *   • no cloud sync
 *   • everything else works exactly as before
 */
export const isCloudEnabled: boolean = !!(URL && KEY);

export const supabase: SupabaseClient | null = isCloudEnabled
  ? createClient(URL!, KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Tables we mirror to the cloud. Keep in sync with SUPABASE_SETUP.md. */
export const CLOUD_TABLES = [
  "categories",
  "habits",
  "entries",
  "day_logs",
  "settings",
] as const;

export type CloudTable = (typeof CLOUD_TABLES)[number];
