import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
import { getExternalPostgresUrl } from "../_shared/external-supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * One-shot setup:
 *  1) Create translations / verify_tokens / hwid_key_ip_log on the EXTERNAL DB.
 *  2) Copy existing translations rows from MAIN → EXTERNAL in batches.
 *
 * Safe to re-run (idempotent).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const log: string[] = [];
  const t0 = Date.now();

  try {
    const externalUrl = getExternalPostgresUrl();
    const sql = postgres(externalUrl, { ssl: "require", max: 1, prepare: false });

    // 1. DDL on external DB
    await sql.unsafe(`
      create table if not exists public.translations (
        id uuid primary key default gen_random_uuid(),
        source_text text not null,
        language text not null,
        translated_text text not null,
        created_at timestamptz not null default now(),
        unique (source_text, language)
      );
      create index if not exists translations_lang_idx on public.translations (language);

      alter table public.translations enable row level security;
      drop policy if exists "Anyone can read translations" on public.translations;
      create policy "Anyone can read translations" on public.translations
        for select using (true);

      create table if not exists public.verify_tokens (
        id uuid primary key default gen_random_uuid(),
        token_hash text not null,
        ip text not null,
        used boolean not null default false,
        used_at timestamptz,
        expires_at timestamptz not null,
        created_at timestamptz not null default now()
      );
      create index if not exists verify_tokens_hash_idx on public.verify_tokens (token_hash);
      create index if not exists verify_tokens_expires_idx on public.verify_tokens (expires_at);
      alter table public.verify_tokens enable row level security;

      create table if not exists public.hwid_key_ip_log (
        id uuid primary key default gen_random_uuid(),
        ip text not null,
        created_at timestamptz not null default now()
      );
      create index if not exists hwid_key_ip_log_ip_idx on public.hwid_key_ip_log (ip);
      create index if not exists hwid_key_ip_log_created_idx on public.hwid_key_ip_log (created_at);
      alter table public.hwid_key_ip_log enable row level security;
    `);
    log.push("DDL done");

    // 2. Copy translations from main → external in batches
    const main = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const BATCH = 1000;
    let from = 0;
    let totalCopied = 0;

    while (true) {
      const { data, error } = await main
        .from("translations")
        .select("source_text, language, translated_text, created_at")
        .order("created_at", { ascending: true })
        .range(from, from + BATCH - 1);

      if (error) throw new Error("main read failed: " + error.message);
      if (!data || data.length === 0) break;

      // Bulk upsert via raw SQL (postgres-js handles large arrays fine)
      const values = data.map(
        (r: any) =>
          sql`(${r.source_text}, ${r.language}, ${r.translated_text}, ${r.created_at})`
      );
      // build a single insert ... values (...),(...) ... on conflict do nothing
      await sql`
        insert into public.translations (source_text, language, translated_text, created_at)
        values ${sql(data.map((r: any) => [r.source_text, r.language, r.translated_text, r.created_at]))}
        on conflict (source_text, language) do nothing
      `;

      totalCopied += data.length;
      log.push(`copied batch from=${from} size=${data.length}`);
      if (data.length < BATCH) break;
      from += BATCH;
    }

    await sql.end({ timeout: 5 });

    return new Response(
      JSON.stringify({
        ok: true,
        totalCopied,
        elapsedMs: Date.now() - t0,
        log,
      }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e), log }, null, 2),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
