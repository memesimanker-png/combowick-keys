// Proxy + cache for inject.today public API (versions + cheats).
// Cached in Redis (10 min) + per-isolate memory; stale-on-error fallback.
import { redisGetJSON, redisSetJSON } from "../_shared/redis.ts";
import { getClientIp, rateLimit, tooManyRequests, memCacheGet, memCacheSet } from "../_shared/throttle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const TTL = 900; // 15 minutes
const ENDPOINTS: Record<string, string> = {
  versions: "https://inject.today/api/versions/current",
  cheats: "https://inject.today/api/cheats",
  updates: "https://inject.today/api/cheats/updates",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  if (!rateLimit(`inject-today:${ip}`, 30, 60_000)) return tooManyRequests(corsHeaders);

  const url = new URL(req.url);
  const part = (url.searchParams.get("part") || "cheats").toLowerCase();
  const upstreamUrl = ENDPOINTS[part];
  if (!upstreamUrl) {
    return new Response(JSON.stringify({ error: "Invalid part" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const headers = {
    ...corsHeaders,
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=900, s-maxage=900, stale-while-revalidate=3600",
  };
  const cacheKey = `inject-today:${part}:v1`;

  const mem = memCacheGet<{ data: unknown; fetchedAt: number }>(cacheKey);
  if (mem && Date.now() - mem.fetchedAt < TTL * 1000) {
    return new Response(JSON.stringify({ ok: true, source: "memory", fetchedAt: mem.fetchedAt, data: mem.data }), { headers });
  }

  const cached = await redisGetJSON<{ data: unknown; fetchedAt: number }>(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < TTL * 1000) {
    memCacheSet(cacheKey, cached, TTL * 1000);
    return new Response(JSON.stringify({ ok: true, source: "redis", fetchedAt: cached.fetchedAt, data: cached.data }), { headers });
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { "User-Agent": "ComboWick/1.0 (+https://combowick.com)" },
      redirect: "follow",
    });
    if (!upstream.ok) {
      if (cached) {
        return new Response(JSON.stringify({ ok: true, source: "stale", fetchedAt: cached.fetchedAt, data: cached.data }), { headers });
      }
      return new Response(JSON.stringify({ error: "Upstream error", status: upstream.status }), {
        status: 502, headers,
      });
    }
    const data = await upstream.json();
    const payload = { data, fetchedAt: Date.now() };
    memCacheSet(cacheKey, payload, TTL * 1000);
    await redisSetJSON(cacheKey, payload, TTL * 4);
    return new Response(JSON.stringify({ ok: true, source: "upstream", fetchedAt: payload.fetchedAt, data }), { headers });
  } catch (e) {
    if (cached) {
      return new Response(JSON.stringify({ ok: true, source: "stale", fetchedAt: cached.fetchedAt, data: cached.data }), { headers });
    }
    return new Response(JSON.stringify({ error: "Fetch failed", details: String(e) }), { status: 502, headers });
  }
});
