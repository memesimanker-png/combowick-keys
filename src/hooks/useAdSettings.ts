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

// --- Cache: ad settings are shared, slow-changing config. Cache 15 min so we don't
// hit Supabase on every page load / component mount. Layers: in-memory (dedup across
// components this session) + localStorage (survives navigation/reload) + inflight
// promise (collapses concurrent mounts into one query). ---
const CACHE_TTL_MS = 15 * 60 * 1000;
const LS_KEY = "ad_settings_cache_v1";

let memRows: AdSettingRow[] | null = null;
let memAt = 0;
let inflight: Promise<AdSettingRow[]> | null = null;

function readLS(): { rows: AdSettingRow[]; at: number } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (Array.isArray(p?.rows) && typeof p?.at === "number") return p;
  } catch { /* ignore */ }
  return null;
}

function writeLS(rows: AdSettingRow[], at: number) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ rows, at })); } catch { /* ignore */ }
}

async function fetchRows(): Promise<AdSettingRow[]> {
  const { data } = await supabase.from("key_ad_settings" as any).select("*");
  return ((data as any) || []) as AdSettingRow[];
}

async function getRows(force = false): Promise<AdSettingRow[]> {
  const now = Date.now();
  if (!force && memRows && now - memAt < CACHE_TTL_MS) return memRows;
  if (!force) {
    const ls = readLS();
    if (ls && now - ls.at < CACHE_TTL_MS) {
      memRows = ls.rows; memAt = ls.at;
      return memRows;
    }
  }
  if (inflight) return inflight;
  inflight = fetchRows()
    .then((r) => { memRows = r; memAt = Date.now(); writeLS(r, memAt); inflight = null; return r; })
    .catch(() => { inflight = null; return memRows || []; });
  return inflight;
}

/** Reads the per-page ad toggles. Defaults to enabled if no row exists. Cached 15 min. */
export function useAdSettings() {
  const [rows, setRows] = useState<AdSettingRow[]>(memRows || []);
  const [loading, setLoading] = useState(!memRows);

  useEffect(() => {
    let alive = true;
    getRows().then((r) => { if (alive) { setRows(r); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  const isAdEnabled = useCallback(
    (page: AdPage, adType: AdType): boolean => {
      const row = rows.find((r) => r.page === page && r.ad_type === adType);
      return row ? row.enabled : true; // default ON when unset
    },
    [rows]
  );

  const reload = useCallback(async () => {
    const r = await getRows(true);
    setRows(r);
  }, []);

  return { rows, loading, isAdEnabled, reload };
}

/** Lightweight one-shot check for non-component contexts. */
export function adEnabledFrom(rows: AdSettingRow[], page: AdPage, adType: AdType): boolean {
  const row = rows.find((r) => r.page === page && r.ad_type === adType);
  return row ? row.enabled : true;
}
