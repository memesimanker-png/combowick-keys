// Videos for the key steps (step 1/2/3 each take one; with fewer videos they repeat).
// PINNED wins while it has entries; otherwise the latest 3 long-form videos from TRIPLE_WICK (ex Kryos Hub1)
// via YouTube's public RSS playlist feed (UULF prefix = uploads, long-form only — filters out Shorts).
// Zero API key, zero quota. Cached in-memory + Redis, served via CDN cache headers.

import { redisGetJSON, redisSetJSON } from "../_shared/redis.ts";

// Bike Universe long-form on TRIPLE_WICK, on all 3 steps until more English long-forms are up.
const PINNED: string[] = ["WIxl2ehPFrs"];

const CHANNEL_SUFFIX = "m6wx1Eo5WqDHoFHa6aFSnA"; // TRIPLE_WICK (Kryos Hub1); @COMBO_WICK was terminated
const PLAYLIST_ID = `UULF${CHANNEL_SUFFIX}`;
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?playlist_id=${PLAYLIST_ID}`;
const CACHE_TTL_MS = 15 * 60 * 60 * 1000; // 15 hours
const REDIS_KEY = "yt-latest:videos:v2";
const REDIS_TTL = 15 * 60 * 60; // 15 hours shared

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

let cache: { at: number; data: any } | null = null;

function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 5)
    .join(" ");
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function fetchLatest() {
  if (PINNED.length) return { videos: PINNED.map((id) => ({ id, title: "", published: "" })), fetchedAt: new Date().toISOString() };
  const res = await fetch(FEED_URL);
  const xml = await res.text();
  const entries = xml.split("<entry>").slice(1);
  const videos: { id: string; title: string; published: string }[] = [];
  const seen = new Set<string>();

  for (const e of entries) {
    const id = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = e.match(/<title>([^<]+)<\/title>/)?.[1];
    const published = e.match(/<published>([^<]+)<\/published>/)?.[1];
    if (!id || !title) continue;
    const key = normalizeTitle(decode(title));
    if (seen.has(key)) continue; // dedupe near-duplicate titles
    seen.add(key);
    videos.push({ id, title: decode(title), published: published || "" });
    if (videos.length >= 3) break;
  }
  return { videos, fetchedAt: new Date().toISOString() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const headers = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=54000, stale-while-revalidate=86400" };
  try {
    if (!cache || Date.now() - cache.at > CACHE_TTL_MS) {
      const shared = await redisGetJSON<any>(REDIS_KEY);
      if (shared) {
        cache = { at: Date.now(), data: shared };
      } else {
        const data = await fetchLatest();
        cache = { at: Date.now(), data };
        await redisSetJSON(REDIS_KEY, data, REDIS_TTL);
      }
    }
    return new Response(JSON.stringify(cache.data), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), videos: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
