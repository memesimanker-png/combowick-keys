// Auto-creates a store script page for a game the first time it's unlocked (e.g. from the
// YouTube app's game picker), so no manual admin work is needed. Idempotent: if a script
// already exists for the universe, returns its slug. Uses the service role (bypasses RLS).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Key-system names often carry emoji/bracket prefixes like "[🌱] Grow a Garden 🌶️" or
// "[⚡️x2]🥊One Punch Training" — strip them for a clean, SEO-friendly display name.
const cleanName = (s: string) =>
  String(s || "")
    .replace(/\[[^\]]*\]/g, " ")                                   // remove [ ... ] tags
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}️‍]/gu, " ") // emojis/symbols
    .replace(/\s+/g, " ")
    .trim() || "Roblox Game";

const slugify = (s: string) =>
  cleanName(s).toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "script";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const ok = (d: unknown) => new Response(JSON.stringify(d), { headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const { universe, name } = await req.json().catch(() => ({}));
    if (!universe) return ok({ error: "universe required" });
    let uni = String(universe).trim();
    if (!/^\d{1,15}$/.test(uni)) return ok({ error: "bad universe", slug: null });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const findSlug = async (u: string) => {
      const { data } = await supabase
        .from("scripts").select("slug").eq("game_universe_id", u).eq("is_paid", false).limit(1).maybeSingle();
      return (data?.slug as string | undefined) || null;
    };

    // Already exists for this universe?
    const existingSlug = await findSlug(uni);
    if (existingSlug) return ok({ slug: existingSlug, created: false });

    // 2026-11-19: the game MUST exist on Roblox. This function is public, and fake ids used to create
    // "Roblox Game" pages with broken icons on /scripts (14 junk rows on 2026-11-16).
    let rootPlace = "";
    const robloxName = async (u: string) => {
      try {
        const r = await fetch(`https://games.roblox.com/v1/games?universeIds=${u}`);
        const j = await r.json();
        const g = j?.data?.[0];
        // Unknown ids come back as a placeholder: id 0, name "[TITLE UNAVAILABLE]".
        if (!g || String(g.id) !== u || !g.rootPlaceId) return "";
        const n = String(g.name || "");
        rootPlace = String(g.rootPlaceId);
        return cleanName(n) === "Roblox Game" ? "" : n;
      } catch { return ""; }
    };
    let rawName = await robloxName(uni);
    if (!rawName) {
      // Maybe a place id: map it to its universe and check again.
      try {
        const r = await fetch(`https://apis.roblox.com/universes/v1/places/${uni}/universe`);
        const j = await r.json();
        if (j?.universeId) {
          uni = String(j.universeId);
          const s = await findSlug(uni);
          if (s) return ok({ slug: s, created: false });
          rawName = await robloxName(uni);
        }
      } catch { /* ignore */ }
    }
    if (!rawName) return ok({ error: "game not found on Roblox", slug: null });
    // Always the real Roblox name (a passed `name` is ignored now: anyone could put any text on a page).
    void name;
    const game = cleanName(rawName);

    // Template from the newest existing script (keeps a valid loadstring/category/tags).
    const { data: tmpl } = await supabase
      .from("scripts").select("code, category, tags").order("updated_at", { ascending: false }).limit(1).maybeSingle();

    // Unique slug.
    let base = slugify(game);
    let slug = base;
    for (let i = 2; i < 50; i++) {
      const { data: clash } = await supabase.from("scripts").select("slug").eq("slug", slug).limit(1).maybeSingle();
      if (!clash) break;
      slug = `${base}-${i}`;
    }

    const year = new Date().getFullYear();
    const description = `Free ${game} script for Roblox — no key needed. Auto farm, ESP, infinite stats and more, working ${year}. Works with all major executors (Wave, Delta, Arceus X Neo). Copy the loadstring and execute — tested and safe.`;
    const longDescription = `The ${game} script from ComboWick is a free, no-key Roblox script for ${game}. It works with every major executor and delivers auto farm, ESP, infinite stats and more. Join ${game}, inject your executor, paste the ComboWick loadstring, and hit Execute — the GUI opens automatically. Updated and tested for ${year}, safe to use on an alt account. Want unlimited access with no timer? Grab a premium key.`;

    const row: Record<string, unknown> = {
      slug,
      // No "[game] Script —" prefix — the SEO layer (prerender + SEOHead) adds that, so a
      // prefix here would double it in the meta title.
      title: `Auto Farm, ESP, Infinite Stats & More (Free · No Key)`,
      game,
      description,
      long_description: longDescription,
      game_universe_id: uni,
      // roblox.com/games/ takes a PLACE id; the page fell back to the universe id = wrong game
      game_url: rootPlace ? `https://www.roblox.com/games/${rootPlace}` : null,
      is_paid: false,
      verified: true,
      trending: false,
      code: tmpl?.code || `loadstring(game:HttpGet("https://raw.githubusercontent.com/checkurasshole/combowick-loader/main/combowick_main.lua"))()`,
      category: tmpl?.category || "Featured",
      tags: [game, `${game} script`, "no key", "auto farm", "roblox"],
      faqs: [
        { question: `Is the ${game} script free?`, answer: `Yes — the ${game} script is completely free and requires no key. Just copy the loadstring and execute.` },
        { question: `Does the ${game} script work on mobile?`, answer: `Yes. It works with mobile executors like Delta and Arceus X Neo as well as PC executors like Wave.` },
        { question: `Is the ${game} script safe?`, answer: `The script is tested and hosted on ComboWick's own servers. As with any script, use an alt account to be safe.` },
      ],
    };

    const { data: created, error } = await supabase.from("scripts").insert(row).select("slug").maybeSingle();
    if (error) return ok({ error: error.message, slug: null });
    return ok({ slug: created?.slug || slug, created: true, game });
  } catch (e) {
    return ok({ error: e instanceof Error ? e.message : String(e), slug: null });
  }
});
