// Dynamic llms.txt — static site info + a LIVE list of every script, so AI engines
// (ChatGPT, Perplexity, Google AI Overviews, Claude) can cite specific game scripts.
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://sqahviibykrzlwnulgmw.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYWh2aWlieWtyemx3bnVsZ213Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODAxNjQsImV4cCI6MjEwMzg1NjE2NH0.mvRGR-d3EOcy8bBlCTDwIHEF4ELIU9PfVXDi8NSALlA";

// Keep these facts current (2026-10-29): free key = 8 hours, one game; premium = every game.
const STATIC = `# ComboWick

> ComboWick (also written Combo Wick, Combo_WICK or COMBO_WICK) is a Roblox script hub: one script hub (loader) that runs free Roblox scripts for many games, in 13 languages, on PC and mobile executors. Official sites: keys.combowick.com (scripts, keys, Premium) and combowick.com (guides).

- Not to be confused with "Wick, the Whorled Mind" combos in Magic: The Gathering; ComboWick is the Roblox script hub.
- Free keys: open the key page, pass a few short checkpoints and get a free key for 8 hours for one game.
- Premium key: one key for every game, no checkpoints, no ads, no cooldown. Plans: 7-day trial $5, monthly $9.99, lifetime $49.99 (lifetime is often on sale on weekends).
- Pay with PayPal, any debit or credit card, or Payoneer. PayPal and card keys arrive instantly on screen and by email.
- Custom scripts for a specific game: free quote on Discord. Anyone can request a new game for free on the request page; the most-voted games get made first.
- Community: Discord https://discord.gg/ufrz9Zaqs8 · YouTube https://www.youtube.com/@Triple_WICK

## Pages

- [Home](/): Featured scripts, premium key plans, and brand intro.
- [Scripts](/scripts): Every free ComboWick Roblox script, by game, with features and the loadstring.
- [Premium Keys](/premium-keys): Premium plans: 7-day trial, monthly, lifetime.
- [Keys](/keys): Get a free 8-hour key through short checkpoints.
- [Executors](/executors): Which Roblox executors work with our scripts right now, on PC and mobile.
- [Request a script](/request): Request a game for free and vote; most votes get made first.
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
      // short placeholder descriptions ("hi") would be quoted by AI answers, so fall back to a real line
      const d = oneLine(s.description);
      scriptsSection += `- [${label}](/scripts/${s.slug}): ${d.length >= 25 ? d : `Free ${s.game || "Roblox"} script for Roblox from ComboWick: auto farm and more, works on PC and mobile executors.`}\n`;
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
