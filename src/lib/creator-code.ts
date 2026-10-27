import { supabase } from "@/integrations/supabase/client";

// Creator codes: a creator shares keys.combowick.com/premium-keys?code=ZEN10 (or the buyer types it at
// checkout). Extra % off Premium monthly/lifetime; the server re-checks the code and the price.
export const CODE_KEY = "cw_creator_code";

// Same rounding as the server (supabase/functions/_shared/key-pricing.ts withCode) — keep in sync.
export function withCode(price: number, pct: number): number {
  if (!pct || pct <= 0) return price;
  return Math.round(price * (1 - pct / 100) * 100) / 100;
}

export async function checkCreatorCode(code: string): Promise<{ code: string; discount_pct: number } | null> {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,20}$/.test(c)) return null;
  const { data, error } = await (supabase as any).rpc("check_creator_code", { p_code: c });
  if (error || !data?.valid) return null;
  return { code: data.code, discount_pct: Number(data.discount_pct) || 0 };
}

// ?code=ZEN10 on any premium link: remember it so it's pre-filled at checkout
export function rememberCodeFromUrl() {
  try {
    const c = new URLSearchParams(window.location.search).get("code");
    if (c && /^[A-Za-z0-9_-]{3,20}$/.test(c)) localStorage.setItem(CODE_KEY, c.toUpperCase());
  } catch { /* storage blocked */ }
}
export function savedCode(): string {
  try { return localStorage.getItem(CODE_KEY) || ""; } catch { return ""; }
}
export function saveCode(c: string | null) {
  try { if (c) localStorage.setItem(CODE_KEY, c); else localStorage.removeItem(CODE_KEY); } catch { /* storage blocked */ }
}
