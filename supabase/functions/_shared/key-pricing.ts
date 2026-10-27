// Server-side source of truth for what a key product costs RIGHT NOW.
// Mirrors the store page exactly: base price -> best of (admin discount in key_discounts, automatic
// weekend/flash sale from src/lib/auto-key-discounts.ts) -> rounded to cents (applyDiscount in
// src/hooks/useKeyDiscounts.ts). Paid-game scripts use their own price (src/lib/paid-games.ts +
// paid_script_settings overrides).
// KEEP IN SYNC with those three files: if the page shows a price this file doesn't accept, the buyer
// gets "Invalid amount" before paying (never charged without a key).

export const BASE_PRICE: Record<string, number> = { "trial-7day": 5, monthly: 9.99, lifetime: 49.99 };
export const PAID_GAMES: Record<string, { monthly: number; lifetime?: number }> = {
  "desert-war": { monthly: 9 },
  "jurassic-blocky": { monthly: 7.99, lifetime: 11.99 },
  "state-of-anarchy": { monthly: 10, lifetime: 17 },
};

// ---- port of src/lib/auto-key-discounts.ts ----
const RULES = [{ days: [5, 6, 0], tiers: { monthly: 20, lifetime: 25 } as Record<string, number> }];
const EXCLUDED = new Set(["trial-7day"]);
const TIER_CAP: Record<string, number> = { monthly: 30, lifetime: 40 };
function daySeed(now: Date): number {
  const key = String(now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate());
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function rand01(seed: number, salt: number): number {
  let x = (seed ^ Math.imul(salt, 2654435761)) >>> 0;
  x ^= x << 13; x >>>= 0;
  x ^= x >> 17;
  x ^= x << 5; x >>>= 0;
  return (x >>> 0) / 4294967296;
}
function tierSalt(t: string): number { let h = 0; for (let i = 0; i < t.length; i++) h = (Math.imul(h, 31) + t.charCodeAt(i)) >>> 0; return h % 97; }
function flashExtra(tierId: string, now: Date): number {
  if (EXCLUDED.has(tierId)) return 0;
  const seed = daySeed(now);
  if (rand01(seed, 2) < 0.083) return 12 + Math.floor(rand01(seed, 30 + tierSalt(tierId)) * 8);
  if (rand01(seed, 1) < 0.33) return 5 + Math.floor(rand01(seed, 40 + tierSalt(tierId)) * 6);
  return 0;
}
export function autoPercent(tierId: string, now: Date): number {
  if (EXCLUDED.has(tierId)) return 0;
  const day = now.getUTCDay();
  let best = 0;
  for (const rule of RULES) {
    if (!rule.days.includes(day)) continue;
    const p = rule.tiers[tierId];
    if (p && p > best) best = p;
  }
  if (best > 0) {
    const extra = flashExtra(tierId, now);
    if (extra) best = Math.max(best, Math.min(best + extra, TIER_CAP[tierId] ?? 40));
  }
  return best;
}
// ---- port of applyDiscount (src/hooks/useKeyDiscounts.ts) ----
function discounted(price: number, percent: number): number {
  if (percent <= 0) return price;
  const final = Math.round(price * (1 - percent / 100) * 100) / 100;
  return final >= price ? price : final;
}

// Every price the page could legitimately have shown for this product around `at`:
// today's price, plus yesterday's for the first 2h after UTC midnight (page opened before the
// sale ended, paid just after). Overpaying is always fine.
// deno-lint-ignore no-explicit-any
export async function acceptedPrices(supabase: any, tier: string, game: string | null, at = new Date()): Promise<number[] | null> {
  if (game) {
    const g = PAID_GAMES[game];
    if (!g) return null;
    let monthly = g.monthly, lifetime = g.lifetime;
    try {
      const { data } = await supabase.from("paid_script_settings").select("monthly_price, lifetime_price").eq("game_key", game).maybeSingle();
      if (data?.monthly_price > 0) monthly = Number(data.monthly_price);
      if (data?.lifetime_price > 0) lifetime = Number(data.lifetime_price);
    } catch { /* fall back to the built-in prices */ }
    const p = tier === "monthly" ? monthly : tier === "lifetime" ? lifetime : undefined;
    return p ? [p] : null;
  }
  const base = BASE_PRICE[tier];
  if (base === undefined) return null;
  let adminPct = 0;
  try {
    const { data } = await supabase.from("key_discounts").select("percent_off, active").eq("tier_id", tier).maybeSingle();
    if (data?.active) adminPct = Number(data.percent_off) || 0;
  } catch { /* no admin discount */ }
  const days = [at];
  if (at.getUTCHours() < 2) days.push(new Date(at.getTime() - 3 * 3600 * 1000));
  return days.map((d) => discounted(base, Math.max(adminPct, autoPercent(tier, d))));
}

// custom_id we put on PayPal orders: "lifetime" or "lifetime|game:jurassic-blocky"
export function encodeOrderTag(tier: string, game: string | null): string {
  return (game ? `${tier}|game:${game}` : tier).slice(0, 127);
}
export function decodeOrderTag(tag: string | null | undefined): { tier: string | null; game: string | null } {
  if (!tag) return { tier: null, game: null };
  const [tier, rest] = tag.split("|");
  return { tier: tier || null, game: rest?.startsWith("game:") ? rest.slice(5) : null };
}
export function paidEnough(paid: number, accepted: number[] | null): boolean {
  if (!accepted || accepted.length === 0) return false;
  return paid >= Math.min(...accepted) - 0.001;   // exact cents (tiny slack only for float maths)
}
