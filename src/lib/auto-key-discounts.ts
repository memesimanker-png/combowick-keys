// Automatic, recurring day-based discounts for PREMIUM KEYS only.
// The $5 7-day trial is never discounted. Prices restore automatically
// as soon as the day window ends (everything is computed live from UTC).
// Strategy: lifetime converts best, so lifetime is discounted every day
// (biggest cut on weekends), monthly gets lighter cuts.

export type AutoDiscount = { percent: number; label: string };

type Rule = {
  /** UTC weekdays this rule is active on (0 = Sunday). */
  days: number[];
  label: string;
  /** percent off per tier id */
  tiers: Record<string, number>;
};

const RULES: Rule[] = [
  {
    days: [1], // Monday
    label: "Monday Reset Sale",
    tiers: { monthly: 15, lifetime: 20 },
  },
  {
    days: [2, 4], // Tuesday + Thursday
    label: "Flash Deal",
    tiers: { monthly: 12, lifetime: 18 },
  },
  {
    days: [3], // Wednesday
    label: "Midweek Deal",
    tiers: { monthly: 10, lifetime: 15 },
  },
  {
    days: [5, 6, 0], // Friday → Sunday
    label: "Weekend Blowout",
    tiers: { monthly: 20, lifetime: 25 },
  },
];

/** Tiers that may never be auto-discounted. */
const EXCLUDED = new Set(["trial-7day"]);

// Hard ceilings per tier — a flash bump can never push past these, so the
// lifetime key never looks "cheap" no matter how the dice land.
const TIER_CAP: Record<string, number> = { monthly: 30, lifetime: 40 };

// ---- Surprise flash sales -------------------------------------------------
// A per-UTC-day deterministic "random" bump layered on top of the base day
// rule. Seeded by the calendar date, so every visitor sees the SAME deal that
// day and it's stable across refreshes (no Math.random at runtime). Feels
// unpredictable day-to-day — which keeps buyers from always waiting for the sale.
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

type Flash = { extra: number; label: string } | null;
function getFlash(tierId: string, now: Date): Flash {
  if (EXCLUDED.has(tierId)) return null;
  const seed = daySeed(now);
  // Mega day (~1 in 12): a bigger, rarer drop for word-of-mouth spikes.
  if (rand01(seed, 2) < 0.083) {
    const extra = 12 + Math.floor(rand01(seed, 30 + tierSalt(tierId)) * 8); // +12..+19
    return { extra, label: "🔥 Mega Sale" };
  }
  // Flash day (~1 in 3): a moderate surprise bump.
  if (rand01(seed, 1) < 0.33) {
    const extra = 5 + Math.floor(rand01(seed, 40 + tierSalt(tierId)) * 6); // +5..+10
    return { extra, label: "⚡ Flash Sale" };
  }
  return null;
}

export function getAutoDiscount(tierId: string, now: Date = new Date()): AutoDiscount | null {
  if (EXCLUDED.has(tierId)) return null;
  const day = now.getUTCDay();
  let best: AutoDiscount | null = null;
  for (const rule of RULES) {
    if (!rule.days.includes(day)) continue;
    const percent = rule.tiers[tierId];
    if (!percent) continue;
    if (!best || percent > best.percent) best = { percent, label: rule.label };
  }

  // Layer today's surprise flash sale on top of the base day rule, capped.
  const flash = getFlash(tierId, now);
  if (flash) {
    const base = best?.percent ?? 0;
    const boosted = Math.min(base + flash.extra, TIER_CAP[tierId] ?? 40);
    if (boosted > base) best = { percent: boosted, label: flash.label };
  }

  return best;
}

/**
 * The real end of the current auto-discount window for a tier — the UTC midnight
 * that starts the first upcoming day whose discount is smaller (or gone). This
 * honestly spans multi-day sales (e.g. the Fri→Sun weekend deal ends Mon 00:00
 * UTC, not tonight). Returns null when there's no active auto discount.
 */
export function getAutoWindowEnd(tierId: string, now: Date = new Date()): Date | null {
  const today = getAutoDiscount(tierId, now);
  if (!today) return null;
  for (let i = 1; i <= 8; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i, 0, 0, 0, 0));
    const fut = getAutoDiscount(tierId, d);
    if (!fut || fut.percent < today.percent) return d;
  }
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
}
