import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---- Types ----
type SupabaseServerClient = SupabaseClient;
type SupabaseBrowserClient = SupabaseClient;

// ---- Server-side service role client (full access, never expose to browser) ----
let serverClient: SupabaseServerClient | null = null;

export function getSupabaseServerClient(): SupabaseServerClient {
  if (serverClient) return serverClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
    );
  }

  serverClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serverClient;
}

// ---- Browser anon client (safe for client-side, row-level security enforced) ----
let browserClient: SupabaseBrowserClient | null = null;

export function getSupabaseBrowserClient(): SupabaseBrowserClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables",
    );
  }

  browserClient = createClient(url, anonKey);

  return browserClient;
}

// ---- Convenience aliases ----
export const supabaseServer = () => getSupabaseServerClient();
export const supabase = () => getSupabaseBrowserClient();
