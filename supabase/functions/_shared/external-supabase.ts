import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Parse the `Supa_url_external` secret blob (comma-separated KEY=VALUE pairs).
 */
function parseExternalEnv(): Record<string, string> {
  const blob = Deno.env.get("Supa_url_external") ?? "";
  const out: Record<string, string> = {};
  if (!blob) return out;
  const parts = blob.split(/,(?=[A-Z_][A-Z0-9_]*=)/);
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    out[p.slice(0, idx).trim()] = p.slice(idx + 1).trim();
  }
  return out;
}

let _client: SupabaseClient | null = null;

/**
 * Service-role client pointing at the **external** Supabase project.
 * Used to offload high-traffic tables (translations, verify_tokens,
 * hwid_key_ip_log) from the main DB.
 */
export function getExternalSupabase(): SupabaseClient {
  if (_client) return _client;
  const env = parseExternalEnv();
  const url = env["SUPABASE_URL_2"];
  const key = env["SUPABASE_SERVICE_ROLE_KEY_2"];
  if (!url || !key) {
    throw new Error("Supa_url_external missing SUPABASE_URL_2 or SUPABASE_SERVICE_ROLE_KEY_2");
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

export function getExternalPostgresUrl(): string {
  const env = parseExternalEnv();
  const url = env["POSTGRES_URL_NON_POOLING_2"] || env["POSTGRES_URL_2"];
  if (!url) throw new Error("POSTGRES_URL not found in Supa_url_external");
  return url;
}

export function getExternalPublicAnon(): { url: string; anon: string } {
  const env = parseExternalEnv();
  return { url: env["SUPABASE_URL_2"], anon: env["SUPABASE_ANON_KEY_2"] };
}
