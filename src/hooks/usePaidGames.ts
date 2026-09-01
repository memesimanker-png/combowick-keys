import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PaidGameSetting {
  hidden: boolean;
  paused: boolean;
  pause_message: string | null;
  title: string | null;
  subtitle: string | null;
  features: string[] | null;
  warning: string | null;
  monthly_price: number | null;
  lifetime_price: number | null;
  monthly_note: string | null;
  lifetime_note: string | null;
  hide_monthly: boolean;
  hide_lifetime: boolean;
}

// Returns admin overrides for paid-game keys.
export function usePaidGameSettings() {
  return useQuery({
    queryKey: ["paid-script-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paid_script_settings")
        .select("game_key, hidden, paused, pause_message, title, subtitle, features, warning, monthly_price, lifetime_price, monthly_note, lifetime_note, hide_monthly, hide_lifetime");
      if (error) throw error;
      const map = new Map<string, PaidGameSetting>();
      (data || []).forEach((r: any) => {
        map.set(r.game_key, {
          hidden: !!r.hidden,
          paused: !!r.paused,
          pause_message: r.pause_message ?? null,
          title: r.title ?? null,
          subtitle: r.subtitle ?? null,
          features: Array.isArray(r.features) ? r.features : null,
          warning: r.warning ?? null,
          monthly_price: r.monthly_price == null ? null : Number(r.monthly_price),
          lifetime_price: r.lifetime_price == null ? null : Number(r.lifetime_price),
          monthly_note: r.monthly_note ?? null,
          lifetime_note: r.lifetime_note ?? null,
          hide_monthly: !!r.hide_monthly,
          hide_lifetime: !!r.hide_lifetime,
        });
      });
      return map;
    },
    staleTime: 5_000,
  });
}

// Back-compat: set of hidden paid-game keys.
export function useHiddenPaidGames() {
  return useQuery({
    queryKey: ["paid-script-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paid_script_settings")
        .select("game_key, hidden");
      if (error) throw error;
      const hidden = new Set<string>();
      (data || []).forEach((r: any) => { if (r.hidden) hidden.add(r.game_key); });
      return hidden;
    },
    staleTime: 60_000,
  });
}
