import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseEnvBlob(blob: string): Record<string, string> {
  const out: Record<string, string> = {};
  // split on commas that precede KEY= patterns
  const parts = blob.split(/,(?=[A-Z_][A-Z0-9_]*=)/);
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const blob = Deno.env.get("Supa_url_external") ?? "";
    if (!blob) {
      return new Response(JSON.stringify({ ok: false, error: "Supa_url_external not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = parseEnvBlob(blob);
    const keys = Object.keys(parsed);

    const url = parsed["SUPABASE_URL_2"];
    const anon = parsed["SUPABASE_ANON_KEY_2"];
    const service = parsed["SUPABASE_SERVICE_ROLE_KEY_2"];

    const result: Record<string, unknown> = { ok: true, keysFound: keys, hasUrl: !!url, hasAnon: !!anon, hasService: !!service };

    if (url && service) {
      const client = createClient(url, service);
      const { error } = await client.from("_nonexistent_probe_").select("*").limit(1);
      // PGRST205 (table not found) means connection works
      result.connectionTest = error ? { code: (error as any).code, message: error.message } : "no error";
      result.connected = !error || ((error as any).code === "PGRST205" || (error as any).code === "42P01");
    }

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
