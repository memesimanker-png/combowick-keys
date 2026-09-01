import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getExternalSupabase } from "../_shared/external-supabase.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  const sb = getExternalSupabase();
  const { error, count } = await sb.from("translations").delete({ count: "exact" }).neq("id", "00000000-0000-0000-0000-000000000000");
  return new Response(JSON.stringify({ deleted: count, error: error?.message ?? null }, null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
