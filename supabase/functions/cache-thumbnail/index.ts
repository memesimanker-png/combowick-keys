import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getClientIp, rateLimit, tooManyRequests } from "../_shared/throttle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
};

const BUCKET = "game-thumbnails";

// Ids we already know are in storage. Kept in this function's memory instead of Redis: every game picker load
// asked Redis about every thumbnail (~1M Redis commands a month, over Upstash's free 500K), and a warm
// instance answers from memory just as fast. A cold instance re-checks storage once per id.
const known = new Set<string>();

async function resolveUniverseId(id: string): Promise<string | null> {
  // First try as universe ID directly
  const thumbRes = await fetch(
    `https://thumbnails.roblox.com/v1/games/icons?universeIds=${id}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`
  );
  if (thumbRes.ok) {
    const data = await thumbRes.json();
    if (data?.data?.[0]?.imageUrl) return id;
  }

  // If that fails, try as place ID → get universe ID
  try {
    const placeRes = await fetch(`https://apis.roblox.com/universes/v1/places/${id}/universe`);
    if (placeRes.ok) {
      const placeData = await placeRes.json();
      if (placeData?.universeId) return String(placeData.universeId);
    }
  } catch {}

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Throttle: 60 thumbnail lookups per IP per minute (most are cached anyway)
  const ip = getClientIp(req);
  if (!rateLimit(`thumb:${ip}`, 60, 60_000)) return tooManyRequests(corsHeaders);

  try {
    const url = new URL(req.url);
    const rawId = url.searchParams.get("id");

    if (!rawId || !/^\d+$/.test(rawId)) {
      return new Response(JSON.stringify({ error: "Missing or invalid id parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const filePath = `${rawId}.png`;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filePath}`;

    // Fast-path: already confirmed in storage by this instance → skip the storage lookup.
    if (known.has(rawId)) {
      return new Response(JSON.stringify({ url: publicUrl, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Check storage cache
    const { data: existing } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 1);

    if (existing?.signedUrl) {
      known.add(rawId);
      return new Response(JSON.stringify({ url: publicUrl, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve the ID (could be universe or place ID)
    const universeId = await resolveUniverseId(rawId);
    if (!universeId) {
      console.error(`Could not resolve ID ${rawId} to a universe ID`);
      return new Response(JSON.stringify({ error: "No thumbnail found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch thumbnail using resolved universe ID
    const robloxRes = await fetch(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`
    );

    if (!robloxRes.ok) {
      return new Response(JSON.stringify({ error: "Roblox API error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const robloxData = await robloxRes.json();
    const thumbnailUrl = robloxData?.data?.[0]?.imageUrl;

    if (!thumbnailUrl) {
      return new Response(JSON.stringify({ error: "No thumbnail found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download and cache
    const imgRes = await fetch(thumbnailUrl);
    if (!imgRes.ok) {
      return new Response(JSON.stringify({ url: thumbnailUrl, cached: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imgBlob = await imgRes.blob();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, imgBlob, { contentType: "image/png", upsert: true });

    if (uploadError) {
      return new Response(JSON.stringify({ url: thumbnailUrl, cached: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    known.add(rawId);
    return new Response(JSON.stringify({ url: publicUrl, cached: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
