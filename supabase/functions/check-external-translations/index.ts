import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getExternalSupabase } from "../_shared/external-supabase.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  const sb = getExternalSupabase();
  const { count } = await sb.from("translations").select("*", { count: "exact", head: true });
  const { data: sample } = await sb
    .from("translations")
    .select("source_text, language, translated_text")
    .in("source_text", ["Welcome", "Login", "Logout"])
    .eq("language", "fr");
  const { data: langs } = await sb.from("translations").select("language");
  const byLang: Record<string, number> = {};
  (langs || []).forEach((r: any) => { byLang[r.language] = (byLang[r.language] || 0) + 1; });
  return new Response(JSON.stringify({ total: count, byLang, sample }, null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
