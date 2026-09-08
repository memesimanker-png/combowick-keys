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
    const uni = String(universe);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Already exists for this universe?
    const { data: existing } = await supabase
      .from("scripts").select("slug").eq("game_universe_id", uni).eq("is_paid", false).limit(1).maybeSingle();
    if (existing?.slug) return ok({ slug: existing.slug, created: false });

    // Resolve the game name (prefer passed name, else Roblox games API), then clean it.
    let rawName = (name && String(name).trim()) || "";
    if (!rawName) {
      try {
        const r = await fetch(`https://games.roblox.com/v1/games?universeIds=${uni}`);
        const j = await r.json();
        rawName = j?.data?.[0]?.name || "";
      } catch { /* ignore */ }
    }
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
