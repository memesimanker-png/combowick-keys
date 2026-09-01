import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAutoDiscount } from "@/lib/auto-key-discounts";

export interface KeyDiscount {
  percent_off: number;
  active: boolean;
  label: string | null;
}

// Returns active discounts for premium key tiers (e.g. "monthly", "lifetime").
// The 7-day trial is intentionally never discounted.
// Admin-set discounts are merged with automatic day-based sales — the bigger one wins,
// and automatic sales expire on their own when the day window ends.
export function useKeyDiscounts() {
  return useQuery({
    queryKey: ["key-discounts", new Date().getUTCDay()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("key_discounts")
        .select("tier_id, percent_off, active, label");
      if (error) throw error;
      const map = new Map<string, KeyDiscount>();
      (data || []).forEach((r: any) => {
        map.set(r.tier_id, {
          percent_off: Number(r.percent_off) || 0,
          active: !!r.active,
          label: r.label ?? null,
        });
      });

      // Layer in automatic day-based sales.
      for (const tierId of ["monthly", "lifetime"]) {
        const auto = getAutoDiscount(tierId);
        if (!auto) continue;
        const existing = map.get(tierId);
        const existingPercent = existing?.active ? existing.percent_off : 0;
        if (auto.percent > existingPercent) {
          map.set(tierId, { percent_off: auto.percent, active: true, label: auto.label });
        }
      }

      return map;
    },
    staleTime: 60_000,
  });
}


// Returns the discounted price (rounded to .99 style) or null when no discount applies.
export function applyDiscount(
  price: number,
  discount?: KeyDiscount,
): { final: number; percent: number; label: string | null } | null {
  if (!discount || !discount.active || discount.percent_off <= 0) return null;
  const raw = price * (1 - discount.percent_off / 100);
  // Keep a clean .99 / .49 feel; round to 2 decimals.
  const final = Math.round(raw * 100) / 100;
  if (final >= price) return null;
  return { final, percent: discount.percent_off, label: discount.label };
}
