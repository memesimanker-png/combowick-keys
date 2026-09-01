import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { redisGet, redisSet, redisDel, redisEnabled } from "../_shared/redis.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const testKey = `health:${Date.now()}`;
  const testValue = `alive-${Date.now()}`;

  try {
    if (!redisEnabled) {
      return new Response(JSON.stringify({ ok: false, redisEnabled: false, error: "Redis env vars not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await redisSet(testKey, testValue, 10);
    const read = await redisGet(testKey);
    await redisDel(testKey);

    if (read !== testValue) {
      return new Response(JSON.stringify({ ok: false, redisEnabled: true, error: "SET/GET mismatch", read }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, redisEnabled: true, message: "Redis is alive" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, redisEnabled, error: e instanceof Error ? e.message : String(e) }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
