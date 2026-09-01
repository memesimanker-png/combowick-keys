import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdPage =
  | "verify-step1"
  | "verify-step2"
  | "verify-step3"
  | "verify-provider-select"
  | "access-key"
  | "keys";

export type AdType =
  | "popunder"
  | "direct_link"
  | "sliding_ad"
  | "skip_ads_banner"
  | "skip_ads_float"
  | "script_promo";

export interface AdSettingRow {
  id: string;
  page: AdPage;
  ad_type: AdType;
  enabled: boolean;
}

export const AD_PAGES: { id: AdPage; label: string }[] = [
  { id: "verify-step1", label: "Verify — Step 1" },
  { id: "verify-step2", label: "Verify — Step 2" },
  { id: "verify-step3", label: "Verify — Step 3" },
  { id: "verify-provider-select", label: "Verify — Provider Select" },
  { id: "access-key", label: "Access Key" },
  { id: "keys", label: "Keys" },
];

export const AD_TYPES: { id: AdType; label: string }[] = [
  { id: "popunder", label: "Monetag Popunder" },
  { id: "direct_link", label: "Monetag Direct Link" },
  { id: "sliding_ad", label: "Promo Modal (Sliding Ad)" },
  { id: "skip_ads_banner", label: "Skip-Ads Banner" },
  { id: "skip_ads_float", label: "Skip-Ads Float Button" },
  { id: "script_promo", label: "Script Promo Popup" },
];

// Which ad types each page actually renders (controls Admin matrix).
export const PAGE_AD_TYPES: Record<AdPage, AdType[]> = {
  "verify-step1": ["sliding_ad", "skip_ads_banner", "skip_ads_float"],
  "verify-step2": ["sliding_ad", "skip_ads_banner", "skip_ads_float"],
  "verify-step3": ["sliding_ad", "skip_ads_banner", "skip_ads_float"],
  "verify-provider-select": ["popunder", "direct_link"],
  "access-key": ["popunder", "direct_link", "skip_ads_banner", "skip_ads_float", "script_promo"],
  keys: ["popunder", "script_promo"],
};

let cache: AdSettingRow[] | null = null;

/** Reads the per-page ad toggles. Defaults to enabled if no row exists. */
export function useAdSettings() {
  const [rows, setRows] = useState<AdSettingRow[]>(cache || []);
  const [loading, setLoading] = useState(!cache);

  const load = useCallback(async () => {
    const { data } = await supabase.from("key_ad_settings" as any).select("*");
    const r = ((data as any) || []) as AdSettingRow[];
    cache = r;
    setRows(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isAdEnabled = useCallback(
    (page: AdPage, adType: AdType): boolean => {
      const row = rows.find((r) => r.page === page && r.ad_type === adType);
      return row ? row.enabled : true; // default ON when unset
    },
    [rows]
  );

  return { rows, loading, isAdEnabled, reload: load };
}

/** Lightweight one-shot check for non-component contexts. */
export function adEnabledFrom(rows: AdSettingRow[], page: AdPage, adType: AdType): boolean {
  const row = rows.find((r) => r.page === page && r.ad_type === adType);
  return row ? row.enabled : true;
}
