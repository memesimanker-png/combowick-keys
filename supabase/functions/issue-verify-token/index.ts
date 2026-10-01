import { getExternalSupabase } from "../_shared/external-supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ORIGINS = [
  "https://shop-ready.lovable.app",
  "https://combowick.com",
  "https://www.combowick.com",
  "https://keys.combowick.com",
  "https://id-preview--46bfc42e-0173-43f1-8213-8466f9d67044.lovable.app",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const h = new URL(origin).hostname;
    // lovable preview/sandbox subdomains + this project's Vercel domains (prod + previews)
    return /.lovable.app$/.test(h) || /^combowick-keys[w-]*.vercel.app$/.test(h);
  } catch {
    return false;
  }
}

function getIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// CPA offer-wall path: the key shop only issues a token once the CPA backend confirms this
// offer-wall session either got a CPALead postback or opened an offer >=40s ago (and burns it).
const CPA_VERIFY_URL = "https://hkspkqbnjdkwyyvxqglv.supabase.co/functions/v1/cpa-verify";
const CPA_VERIFY_SECRET = Deno.env.get("CPA_VERIFY_SECRET") || "";

async function cpaCheck(subid: string): Promise<{ ok: boolean; reason?: string; payout?: number }> {
  if (!CPA_VERIFY_SECRET) return { ok: false, reason: "not_configured" };
  try {
    const u = `${CPA_VERIFY_URL}?subid=${encodeURIComponent(subid)}&consume=1&secret=${encodeURIComponent(CPA_VERIFY_SECRET)}`;
    const r = await fetch(u);
    const j = await r.json().catch(() => ({}));
    return j?.ok ? { ok: true, payout: Number(j.payout) || 0 } : { ok: false, reason: j?.reason || `http_${r.status}` };
  } catch {
    return { ok: false, reason: "cpa_unreachable" };
  }
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer") || "";
    if (!isAllowedOrigin(origin)) {
      console.warn("[issue-verify-token] blocked origin:", origin, "referer:", referer);
      return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({} as any));
    // Key length follows what the unlock paid (admin: verify_settings.key_hours_*):
    //   CPA offer paying >= OFFER_MIN_PAYOUT -> key_hours_offer (24) · cheaper / CPC click -> key_hours_cpc (6)
    //   Linkvertise (no method) -> key_hours_linkvertise (6)
    const OFFER_MIN_PAYOUT = 0.2;
    let method = "linkvertise";
    let payout = 0;
    if (body?.method === "cpa") {
      const subid = String(body?.subid || "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 40);
      const chk = subid ? await cpaCheck(subid) : { ok: false, reason: "missing_subid" };
      if (chk.ok) { payout = chk.payout || 0; method = payout >= OFFER_MIN_PAYOUT ? "offer" : "cpc"; }
      if (!chk.ok) {
        return new Response(JSON.stringify({ success: false, error: "offer_not_done", reason: chk.reason }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const ip = getIp(req);
    const token = randomToken();
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Offloaded to EXTERNAL Supabase.
    const supabase = getExternalSupabase();

    let hours = method === "offer" ? 24 : method === "cpc" ? 6 : 6;
    try {
      const { data: vs } = await supabase.from("verify_settings")
        .select("key_hours_offer, key_hours_cpc, key_hours_linkvertise").eq("id", 1).maybeSingle();
      const v: any = vs || {};
      const pick = method === "offer" ? v.key_hours_offer : method === "cpc" ? v.key_hours_cpc : v.key_hours_linkvertise;
      if (Number(pick) > 0) hours = Number(pick);
    } catch { /* keep defaults */ }

    const { error } = await supabase.from("verify_tokens").insert({
      token_hash: tokenHash,
      ip,
      expires_at: expiresAt,
      hours,
      method,
    });
    if (error) {
      console.error("[issue-verify-token] db error:", error);
      return new Response(JSON.stringify({ success: false, error: "Internal error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, token, expires_at: expiresAt, hours, method }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[issue-verify-token] error:", e);
    return new Response(JSON.stringify({ success: false, error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
