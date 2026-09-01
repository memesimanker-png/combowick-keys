import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getClientIp, rateLimit, tooManyRequests } from "../_shared/throttle.ts";
import { getExternalSupabase } from "../_shared/external-supabase.ts";
import { redisGetJSON, redisSetJSON } from "../_shared/redis.ts";

// Aggressive Redis cache for whole translation batches — TTL 15 min.
// Avoids the external Supabase DB roundtrip entirely on repeated batches,
// which is the main egress/cost driver for this function.
const REDIS_TTL = 15 * 60; // 15 minutes
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
function redisBatchKey(lang: string, texts: string[]) {
  return `tr:${lang}:${djb2(texts.slice().sort().join("\u0001"))}`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  // Cloudflare-style stale-while-revalidate: cache identical translation batches for 1h,
  // serve stale up to 24h while a background refresh hits the AI gateway.
  "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
  "CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

// Tiny in-memory hot cache (per isolate). Skips DB roundtrip for repeated batches
// from the same warm worker — the DB cache is still authoritative for cold starts.
const HOT_TTL_MS = 5 * 60 * 1000;
const hot = new Map<string, { value: Record<string, string>; ts: number }>();
function hotKey(lang: string, texts: string[]) {
  return lang + "|" + texts.slice().sort().join("\u0001");
}

const LANG_NAMES: Record<string, string> = {
  fr: "French", th: "Thai", ko: "Korean", "zh-CN": "Simplified Chinese",
  de: "German", ru: "Russian", id: "Indonesian", pt: "Portuguese",
  fil: "Filipino", es: "Spanish", vi: "Vietnamese",
};

// Reject garbage translations whose script doesn't match the target language.
// e.g. German ("de") output should never be Hangul/CJK/Thai — when the AI is
// degraded it sometimes returns junk like "솜ㅅ ㅡㄷ무". Dropping it keeps the
// original English (readable) instead of caching/showing broken characters.
const LATIN_LANGS = new Set(["fr", "de", "id", "pt", "fil", "es", "vi"]);
const NON_LATIN_RE = /[\u1100-\u11FF\u3040-\u30FF\u3130-\u318F\uAC00-\uD7AF\u4E00-\u9FFF\u0E00-\u0E7F]/;
function isValidTranslation(language: string, source: string, translated: string): boolean {
  if (typeof translated !== "string") return false;
  const t = translated.trim();
  if (!t) return false;
  // Latin-script target must not be dominated by CJK/Hangul/Thai characters.
  if (LATIN_LANGS.has(language)) {
    const bad = (t.match(new RegExp(NON_LATIN_RE, "g")) || []).length;
    if (bad > 0 && bad / t.length > 0.15) return false;
  }
  return true;
}


// Pollinations.ai fallback — free, no quota. Used when Lovable AI returns 402/429.
async function pollinationsTranslate(texts: string[], langName: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const token = Deno.env.get("pollinations_ai");
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const prompt = `Translate the following numbered English texts to ${langName}. Return ONLY a JSON object mapping each original English text (exact string, no numbering) to its ${langName} translation. Keep brand names (ComboWick, Combo_WICK, PayPal, Discord, Roblox) unchanged.\n\n${numbered}`;
  try {
    // NOTE: legacy text.pollinations.ai/openai is deprecated (returns 404/502).
    // Use the current gen.pollinations.ai OpenAI-compatible endpoint.
    // Model "claude-fast" benchmarked fastest (~3s) with the best VI/zh quality
    // and exact-string JSON keys vs openai/deepseek alternatives.
    const res = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        model: "claude-fast",
        messages: [
          { role: "system", content: "You are a professional translator. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.error("pollinations fallback failed:", res.status, await res.text());
      return out;
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    // Extract first JSON object
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return out;
    const parsed = JSON.parse(match[0]);
    for (const k of Object.keys(parsed)) {
      if (typeof parsed[k] === "string") out[k] = parsed[k];
    }
  } catch (e) {
    console.error("pollinations error:", e);
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Throttle: max 30 translate requests per IP per minute
  const ip = getClientIp(req);
  if (!rateLimit(`translate:${ip}`, 30, 60_000)) return tooManyRequests(corsHeaders);

  try {
    const { texts, language } = await req.json();

    if (!texts || !Array.isArray(texts) || !language || language === "en") {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langName = LANG_NAMES[language];
    if (!langName) {
      return new Response(JSON.stringify({ error: "Unsupported language" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hot in-memory cache: skip DB hit entirely if this exact batch was served recently.
    const hk = hotKey(language, texts);
    const hotHit = hot.get(hk);
    if (hotHit && Date.now() - hotHit.ts < HOT_TTL_MS) {
      return new Response(JSON.stringify({ translations: hotHit.value }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Redis batch cache (15 min) — skips the external DB roundtrip entirely.
    const rk = await redisBatchKey(language, texts);
    const redisHit = await redisGetJSON<Record<string, string>>(rk);
    if (redisHit && texts.every((t: string) => redisHit[t])) {
      hot.set(hk, { value: redisHit, ts: Date.now() });
      return new Response(JSON.stringify({ translations: redisHit }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Offloaded to EXTERNAL Supabase (reduces egress + storage on main project).
    const supabase = getExternalSupabase();

    // Check cache first
    const { data: cached } = await supabase
      .from("translations")
      .select("source_text, translated_text")
      .eq("language", language)
      .in("source_text", texts);

    const cachedMap: Record<string, string> = {};
    (cached || []).forEach((r: any) => { cachedMap[r.source_text] = r.translated_text; });

    const missing = texts.filter((t: string) => !cachedMap[t]);

    if (missing.length === 0) {
      hot.set(hk, { value: cachedMap, ts: Date.now() });
      redisSetJSON(rk, cachedMap, REDIS_TTL).catch(() => {});
      return new Response(JSON.stringify({ translations: cachedMap }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch translate missing texts via AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Process in chunks of 40 to avoid token limits
    const chunks: string[][] = [];
    for (let i = 0; i < missing.length; i += 40) {
      chunks.push(missing.slice(i, i + 40));
    }

    const allTranslated: Record<string, string> = {};

    for (const chunk of chunks) {
      const numbered = chunk.map((t, i) => `${i + 1}. ${t}`).join("\n");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5.2",
          messages: [
            {
              role: "system",
              content: `You are a professional translator. Translate the numbered texts from English to ${langName}. Return ONLY a JSON object mapping each original English text to its ${langName} translation. Keep brand names like "ComboWick", "Combo_WICK", "PayPal", "Discord", "Roblox" unchanged. Keep formatting symbols like bullet points. Be natural and fluent.`
            },
            {
              role: "user",
              content: `Translate these texts to ${langName}:\n\n${numbered}`
            }
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        if (response.status === 429 || response.status === 402) {
          // Lovable AI exhausted/rate-limited — fall back to Pollinations.ai (free).
          const pollinated = await pollinationsTranslate(chunk, langName);
          Object.assign(allTranslated, pollinated);
          continue;
        }
        throw new Error("AI gateway error");
      }


      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) continue;

      try {
        const parsed = JSON.parse(content);
        Object.assign(allTranslated, parsed);
      } catch {
        console.error("Failed to parse AI response:", content);
      }
    }

    // Drop any garbage translations (wrong-script junk from a degraded AI) so we
    // never cache or serve them — the original English stays visible instead.
    for (const key of Object.keys(allTranslated)) {
      if (!isValidTranslation(language, key, allTranslated[key])) {
        delete allTranslated[key];
      }
    }

    // Cache results in DB
    const rows = Object.entries(allTranslated).map(([source, translated]) => ({
      source_text: source,
      language,
      translated_text: translated as string,
    }));

    if (rows.length > 0) {
      await supabase.from("translations").upsert(rows, {
        onConflict: "source_text,language",
      });
    }

    const merged = { ...cachedMap, ...allTranslated };
    // Populate hot cache & lightly bound its size so isolates don't leak memory.
    hot.set(hk, { value: merged, ts: Date.now() });
    redisSetJSON(rk, merged, REDIS_TTL).catch(() => {});
    if (hot.size > 500) {
      const oldest = hot.keys().next().value;
      if (oldest) hot.delete(oldest);
    }

    // If some requested texts still have no translation, every AI source
    // (Lovable AI + Pollinations fallback) is exhausted/failing. Signal the
    // client so it can show an outage notice instead of silently failing.
    const stillMissing = missing.filter((t: string) => !merged[t]);
    const degraded = stillMissing.length > 0;

    return new Response(JSON.stringify({ translations: merged, degraded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
