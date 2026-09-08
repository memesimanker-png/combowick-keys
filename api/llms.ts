// Dynamic llms.txt — static site info + a LIVE list of every script, so AI engines
// (ChatGPT, Perplexity, Google AI Overviews, Claude) can cite specific game scripts.
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://sqahviibykrzlwnulgmw.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYWh2aWlieWtyemx3bnVsZ213Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODAxNjQsImV4cCI6MjEwMzg1NjE2NH0.mvRGR-d3EOcy8bBlCTDwIHEF4ELIU9PfVXDi8NSALlA";

const STATIC = `# ComboWick

> ComboWick is a Roblox script hub offering free Lua scripts, premium HWID keys, executor reviews, and Lua tutorials with instant PayPal delivery and 24/7 Discord support.

ComboWick (also written COMBO_WICK or Combo Wick) publishes free and premium Roblox scripts compatible with popular executors. Users get free 24-hour keys via a verification flow or buy premium keys ($5 trial, $9.99 monthly, $49.99 lifetime) for full access.

## Pages

- [Home](/): Featured scripts, premium key plans, and brand intro.
- [Scripts](/scripts): Browse all free and premium Roblox Lua scripts by game and category.
- [Premium Keys](/premium-keys): Buy HWID premium keys — trial, monthly, or lifetime.
- [Keys](/keys): Get a free 24-hour HWID key through the verification flow.
`;

const OPTIONAL = `
## Optional

- [Anti-Cheat Guide](/anti-cheat-guide)
- [Refund Policy](/refund-policy): All sales are final — no refunds.
- [Privacy](/privacy)
- [Terms](/terms)
`;

const oneLine = (s: any) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, 160);

export default async function handler(_req: any, res: any) {
  let scripts: any[] = [];
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data } = await supabase
      .from("scripts")
      .select("slug, title, game, description, is_paid")
      .order("updated_at", { ascending: false })
      .limit(500);
    scripts = data || [];
  } catch { /* static only */ }

  let scriptsSection = "\n## Scripts\n\n";
  if (scripts.length) {
    for (const s of scripts) {
      if (!s.slug) continue;
      const label = `${s.game || "Roblox"} Script${s.is_paid ? " (Premium)" : " (Free, No Key)"}`;
      scriptsSection += `- [${label}](/scripts/${s.slug}): ${oneLine(s.description) || `Free ${s.game} script for Roblox — auto farm, ESP and more, works with all major executors.`}\n`;
    }
  } else {
    scriptsSection += "- [All Scripts](/scripts): Browse the full library of Roblox scripts by game.\n";
  }

  const body = STATIC + scriptsSection + OPTIONAL;
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400");
  return res.end(body);
}
