// Proxy + cache for https://executors.online/api/executors
// Caches 60s in Redis (if available) and in-memory; serves stale on upstream failure.
import { redisGetJSON, redisSetJSON } from "../_shared/redis.ts";
import { getClientIp, rateLimit, tooManyRequests, memCacheGet, memCacheSet } from "../_shared/throttle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const CACHE_KEY = "executors-online:list:v1";
const TTL_SECONDS = 900; // 15 minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  if (!rateLimit(`executors-online:${ip}`, 30, 60_000)) return tooManyRequests(corsHeaders);

  const headers = {
    ...corsHeaders,
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=900, s-maxage=900, stale-while-revalidate=3600",
  };

  // memory cache (per-isolate)
  const mem = memCacheGet<{ data: unknown; fetchedAt: number }>(CACHE_KEY);
  if (mem && Date.now() - mem.fetchedAt < TTL_SECONDS * 1000) {
    return new Response(JSON.stringify({ ok: true, source: "memory", fetchedAt: mem.fetchedAt, data: mem.data }), { headers });
  }

  // redis cache
  const cached = await redisGetJSON<{ data: unknown; fetchedAt: number }>(CACHE_KEY);
  if (cached && Date.now() - cached.fetchedAt < TTL_SECONDS * 1000) {
    memCacheSet(CACHE_KEY, cached, TTL_SECONDS * 1000);
    return new Response(JSON.stringify({ ok: true, source: "redis", fetchedAt: cached.fetchedAt, data: cached.data }), { headers });
  }

  try {
    const upstream = await fetch("https://executors.online/api/executors", {
      headers: { "User-Agent": "ComboWick/1.0 (+https://combowick.com)" },
      redirect: "follow",
    });
    if (!upstream.ok) {
      if (cached) {
        return new Response(JSON.stringify({ ok: true, source: "stale", fetchedAt: cached.fetchedAt, data: cached.data }), { headers });
      }
      return new Response(JSON.stringify({ error: "Upstream error", details: `status ${upstream.status}` }), { status: 502, headers });
    }
    const data = await upstream.json();
    const payload = { data, fetchedAt: Date.now() };
    memCacheSet(CACHE_KEY, payload, TTL_SECONDS * 1000);
    await redisSetJSON(CACHE_KEY, payload, TTL_SECONDS * 4); // keep stale for 1h
    return new Response(JSON.stringify({ ok: true, source: "upstream", fetchedAt: payload.fetchedAt, data }), { headers });
  } catch (e) {
    if (cached) {
      return new Response(JSON.stringify({ ok: true, source: "stale", fetchedAt: cached.fetchedAt, data: cached.data }), { headers });
    }
    return new Response(JSON.stringify({ error: "Fetch failed", details: String(e) }), { status: 502, headers });
  }
});
