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
