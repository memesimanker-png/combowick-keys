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

// ---- creator codes ----
// A creator code takes an extra % off the price shown (stacks on top of any sale), Premium monthly +
// lifetime only (not the $5 trial, not paid-game scripts). The creator earns commission_pct of what
// was actually paid; payouts are manual (admin Creator Codes tab).
export const CODE_TIERS = new Set(["monthly", "lifetime"]);
export type CreatorCode = { code: string; discount_pct: number; commission_pct: number; payout_email: string | null };
// deno-lint-ignore no-explicit-any
// includeInactive: the capture step honours a code that was switched off while the buyer was paying
export async function lookupCreatorCode(supabase: any, code: string | null | undefined, includeInactive = false): Promise<CreatorCode | null> {
  const c = String(code || "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,20}$/.test(c)) return null;
  try {
    const { data } = await supabase.from("creator_codes").select("code, discount_pct, commission_pct, active, payout_email").eq("code", c).maybeSingle();
    if (!data || (!data.active && !includeInactive)) return null;
    return { code: data.code, discount_pct: Number(data.discount_pct) || 0, commission_pct: Number(data.commission_pct) || 0, payout_email: data.payout_email || null };
  } catch {
    return null;
  }
}
// No commission when the buyer paid from the creator's own payout email (self-referral).
export function commissionFor(cc: CreatorCode | null, paid: number, payerEmail: string | null | undefined): number | null {
  if (!cc) return null;
  if (cc.payout_email && payerEmail && cc.payout_email.trim().toLowerCase() === String(payerEmail).trim().toLowerCase()) return 0;
  return Math.round(paid * cc.commission_pct) / 100;
}
// same rounding as the checkout page (src/lib/creator-code.ts)
export function withCode(price: number, pct: number): number {
  if (!pct || pct <= 0) return price;
  return Math.round(price * (1 - pct / 100) * 100) / 100;
}

// ---- promo coupons (STREAK-xxxxxx / TRIAL-xxxxxx) ----
// Single-use % off Premium monthly/lifetime, minted by the hub for a 7-day key streak or a $5 trial that's
// ending. They live in the executor DB next to the key data (promo_coupons): checked with cw_check_coupon,
// burned with cw_use_coupon (service role) once PayPal has the money. A promo and a creator code don't
// stack: the bigger discount wins (the creator still gets credit for the order).
export type PromoCode = { code: string; kind: string; discount_pct: number };
async function execRpc(fn: string, body: unknown): Promise<unknown> {
  const url = Deno.env.get("EXEC_SB_URL"), key = Deno.env.get("EXEC_SB_SERVICE");
  if (!url || !key) throw new Error("EXEC_SB_URL / EXEC_SB_SERVICE not set");
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${fn} ${r.status}`);
  return await r.json();
}
// includeUsed: the capture step re-reads a code it already accepted at checkout
export async function lookupPromo(code: string | null | undefined, includeUsed = false): Promise<PromoCode | null> {
  const c = String(code || "").trim().toUpperCase();
  if (!/^[A-Z]+-[A-Z0-9]{6}$/.test(c)) return null;
  try {
    // deno-lint-ignore no-explicit-any
    const d = await execRpc("cw_check_coupon", { p_code: c, p_include_used: includeUsed }) as any;
    return d?.valid ? { code: d.code, kind: d.kind, discount_pct: Number(d.discount_pct) || 0 } : null;
  } catch (e) {
    console.error("[promo] lookup failed:", e);
    return null;
  }
}
// Burn the code for this order when PayPal confirms the money. true = the code was unused (or already burned by
// this same order: retries) -> the discount counts; false = used by another order / expired -> no discount;
// null = the coupon server didn't answer -> trust the checkout's earlier check (logged).
// graceHours: how long after expiry a payment started before it still counts (eChecks clear days later).
export async function usePromo(code: string, orderId: string, graceHours = 6): Promise<boolean | null> {
  try {
    return (await execRpc("cw_use_coupon", { p_code: code, p_order: orderId, p_grace_hours: graceHours })) === true;
  } catch (e) {
    console.error("[promo] burn failed:", code, orderId, e);
    return null;
  }
}
// the % a paid order gets from its promo tag: burned for this order (or coupon server down) -> its %, else 0
export async function promoPctForOrder(code: string | null, orderId: string, graceHours = 6): Promise<number> {
  if (!code) return 0;
  const burned = await usePromo(code, orderId, graceHours);
  if (burned === false) { console.warn(`[promo] ${code} refused for order ${orderId} (used by another order or expired)`); return 0; }
  const p = await lookupPromo(code, true);
  return p?.discount_pct ?? 20;
}
// the discount an order gets: the bigger of its creator code and its promo code
export function bestPct(cc: CreatorCode | null, promo: PromoCode | null): number {
  return Math.max(cc?.discount_pct || 0, promo?.discount_pct || 0);
}

// custom_id we put on PayPal orders: "lifetime", "lifetime|game:jurassic-blocky", "monthly|code:ZEN10", "monthly|promo:TRIAL-AB12CD"
export function encodeOrderTag(tier: string, game: string | null, code: string | null = null, promo: string | null = null): string {
  let t = tier;
  if (game) t += `|game:${game}`;
  if (code) t += `|code:${code}`;
  if (promo) t += `|promo:${promo}`;
  return t.slice(0, 127);
}
export function decodeOrderTag(tag: string | null | undefined): { tier: string | null; game: string | null; code: string | null; promo: string | null } {
  if (!tag) return { tier: null, game: null, code: null, promo: null };
  const [tier, ...rest] = tag.split("|");
  const get = (k: string) => rest.find((r) => r.startsWith(k + ":"))?.slice(k.length + 1) || null;
  return { tier: tier || null, game: get("game"), code: get("code"), promo: get("promo") };
}
export function paidEnough(paid: number, accepted: number[] | null): boolean {
  if (!accepted || accepted.length === 0) return false;
  return paid >= Math.min(...accepted) - 0.001;   // exact cents (tiny slack only for float maths)
}
