import { supabase } from "@/integrations/supabase/client";

// Creator codes: a creator shares keys.combowick.com/premium-keys?code=ZEN10 (or the buyer types it at
// checkout). Extra % off Premium monthly/lifetime; the server re-checks the code and the price.
// Promo coupons (TRIAL-AB12CD / STREAK-AB12CD) go through the same box: single-use codes the hub hands out
// (?promo=TRIAL-AB12CD links). They live in the key server's DB; the checkout burns them after payment.
export const CODE_KEY = "cw_creator_code";
const EXEC_URL = "https://yrlxosurmcpxrlmxckke.supabase.co";
// public anon key of the key server (same one the hub uses); cw_check_coupon is read-only
const EXEC_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybHhvc3VybWNweHJsbXhja2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MjQ2NzQsImV4cCI6MjA2NjAwMDY3NH0.F6y_yw26UOJPGDFyhBQ0u__QNf0FPzL2uwbuGhntWYQ";

export type CheckoutCode = { code: string; discount_pct: number; kind: "creator" | "promo" };

// Same rounding as the server (supabase/functions/_shared/key-pricing.ts withCode) — keep in sync.
export function withCode(price: number, pct: number): number {
  if (!pct || pct <= 0) return price;
  return Math.round(price * (1 - pct / 100) * 100) / 100;
}

async function checkPromoCode(c: string): Promise<CheckoutCode | null> {
  if (!/^[A-Z]+-[A-Z0-9]{6}$/.test(c)) return null;
  try {
    const r = await fetch(`${EXEC_URL}/rest/v1/rpc/cw_check_coupon`, {
      method: "POST",
      headers: { apikey: EXEC_ANON, Authorization: `Bearer ${EXEC_ANON}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_code: c }),
    });
    const d = await r.json();
    return d?.valid ? { code: d.code, discount_pct: Number(d.discount_pct) || 0, kind: "promo" } : null;
  } catch {
    return null;
  }
}

// creator code first, then a promo coupon
export async function checkCreatorCode(code: string): Promise<CheckoutCode | null> {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,20}$/.test(c)) return null;
  const { data, error } = await (supabase as any).rpc("check_creator_code", { p_code: c });
  if (!error && data?.valid) return { code: data.code, discount_pct: Number(data.discount_pct) || 0, kind: "creator" };
  return await checkPromoCode(c);
}

// ?code=ZEN10 or ?promo=TRIAL-AB12CD on any link: remember it so it's pre-filled at checkout
export function rememberCodeFromUrl() {
  try {
    const q = new URLSearchParams(window.location.search);
    const c = q.get("promo") || q.get("code");
    if (c && /^[A-Za-z0-9_-]{3,20}$/.test(c)) localStorage.setItem(CODE_KEY, c.toUpperCase());
  } catch { /* storage blocked */ }
}
export function savedCode(): string {
  try { return localStorage.getItem(CODE_KEY) || ""; } catch { return ""; }
}
export function saveCode(c: string | null) {
  try { if (c) localStorage.setItem(CODE_KEY, c); else localStorage.removeItem(CODE_KEY); } catch { /* storage blocked */ }
}
