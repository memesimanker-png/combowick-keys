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

// ---- Linkvertise step chain (2026-11-01, after a reported 1-second bypass) ----
// The old Linkvertise path gave a token to anyone who asked: the only "proof" was localStorage flags + a ?hash=
// the browser checked. Now the site reports every step to the server (action "start" when step 1's Linkvertise
// opens, then "step" with Linkvertise's ?hash= on each return) and a key token needs a complete chain for that
// verify session: start -> step1 -> ... -> last step, in order, each at least MIN_STEP_GAP_S after the one before,
// every hash used once, all within CHAIN_MAX_MIN. One token per chain.
const MIN_STEP_GAP_S = 8;      // a Linkvertise page (ads + countdown) can't be done faster than this
const CHAIN_MAX_MIN = 60;
const SID_RE = /^[a-f0-9]{32}$/;
const STEPS = ["step1", "step2", "step3"];
// Linkvertise Anti-Bypassing: every step's ?hash= is checked with Linkvertise itself (the hash lives 10 s and verifies
// TRUE exactly once). LV_ENFORCE=false = log only (lv_ok stored per step); true = a step whose hash Linkvertise didn't
// confirm is refused. Linkvertise's own advice: log first, enforce once real visitors verify.
const LV_TOKEN = Deno.env.get("LINKVERTISE_AB_TOKEN") || "";
const LV_ENFORCE = (Deno.env.get("LV_ENFORCE") || "false") === "true";
async function lvVerify(hash: string): Promise<{ ok: boolean | null; resp: string }> {
  if (!LV_TOKEN || !/^[A-Za-z0-9]{64}$/.test(hash)) return { ok: false, resp: LV_TOKEN ? "bad_hash_format" : "no_token" };
  try {
    const r = await fetch(`https://publisher.linkvertise.com/api/v1/anti_bypassing?token=${LV_TOKEN}&hash=${encodeURIComponent(hash)}`, { method: "POST", signal: AbortSignal.timeout(4000) });
    const t = await r.text();
    let st: unknown = null; try { st = JSON.parse(t)?.status; } catch { /* plain text */ }
    if (st === true || /^\s*true\s*$/i.test(t)) return { ok: true, resp: "true" };
    if (st === false || /^\s*false\s*$/i.test(t)) return { ok: false, resp: "false" };
    return { ok: null, resp: t.slice(0, 80) };   // "Invalid token." / outage: unknown, not the visitor's fault
  } catch (e) {
    return { ok: null, resp: "unreachable" };
  }
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
// deno-lint-ignore no-explicit-any
async function lastStepName(supabase: any): Promise<string> {
  try {
    const { data } = await supabase.from("verify_settings").select("verify_steps").eq("id", 1).maybeSingle();
    return Number(data?.verify_steps) === 2 ? "step2" : "step3";
  } catch { return "step3"; }
}
// deno-lint-ignore no-explicit-any
async function recordStep(supabase: any, sid: string, step: string, hash: string | null, ip: string): Promise<{ ok: boolean; reason?: string }> {
  const { data: rows } = await supabase.from("verify_steps").select("step, created_at").eq("sid", sid);
  const have = new Map((rows || []).map((r: any) => [r.step, new Date(r.created_at).getTime()]));
  if (have.has("token")) return { ok: false, reason: "used" };
  if (step !== "start") {
    const prev = step === "step1" ? "start" : STEPS[STEPS.indexOf(step) - 1];
    const prevAt = have.get(prev) as number | undefined;
    if (!prevAt) return { ok: false, reason: "out_of_order" };
    if (Date.now() - prevAt < MIN_STEP_GAP_S * 1000) return { ok: false, reason: "too_fast" };
    if (!hash || hash.length < 6) return { ok: false, reason: "no_hash" };
  }
  // ask Linkvertise right away (the hash expires 10 s after the visitor finished the page)
  const lv = step === "start" ? { ok: null, resp: null } : await lvVerify(hash as string);
  if (LV_ENFORCE && step !== "start" && lv.ok === false) return { ok: false, reason: "lv_not_verified" };
  const { error } = await supabase.from("verify_steps").insert({ sid, step, hash: step === "start" ? null : hash, ip, lv_ok: lv.ok, lv_resp: lv.resp });
  if (error) return { ok: false, reason: String(error.code) === "23505" ? "repeat" : "db" };
  return { ok: true };
}
// deno-lint-ignore no-explicit-any
async function chainComplete(supabase: any, sid: string): Promise<{ ok: boolean; reason?: string }> {
  const last = await lastStepName(supabase);
  const need = ["start", ...STEPS.slice(0, STEPS.indexOf(last) + 1)];
  const { data: rows } = await supabase.from("verify_steps").select("step, created_at").eq("sid", sid);
  const at = new Map((rows || []).map((r: any) => [r.step, new Date(r.created_at).getTime()]));
  if (at.has("token")) return { ok: false, reason: "used" };
  for (let i = 0; i < need.length; i++) {
    const t = at.get(need[i]) as number | undefined;
    if (!t) return { ok: false, reason: "missing_" + need[i] };
    if (i > 0 && t - (at.get(need[i - 1]) as number) < MIN_STEP_GAP_S * 1000) return { ok: false, reason: "too_fast" };
  }
  if (Date.now() - (at.get("start") as number) > CHAIN_MAX_MIN * 60000) return { ok: false, reason: "expired" };
  return { ok: true };
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
    const sid = String(body?.sid || "");

    // the site reports a Linkvertise step (start = step 1's Linkvertise just opened)
    if (body?.action === "start" || body?.action === "step") {
      if (!SID_RE.test(sid)) return json({ success: false, error: "bad_session" }, 400);
      const step = body.action === "start" ? "start" : String(body?.step || "");
      if (step !== "start" && !STEPS.includes(step)) return json({ success: false, error: "bad_step" }, 400);
      const hash = typeof body?.hash === "string" ? body.hash.slice(0, 300) : null;
      const r = await recordStep(getExternalSupabase(), sid, step, hash, getIp(req));
      if (!r.ok) console.warn("[issue-verify-token] step refused:", step, r.reason, getIp(req));
      return json({ success: r.ok, reason: r.reason }, r.ok ? 200 : 403);
    }
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

    // Linkvertise path: only for a complete step chain (the CPA path above already proved its offer server-side)
    if (method === "linkvertise") {
      if (!SID_RE.test(sid)) return json({ success: false, error: "steps_not_done", reason: "no_session" }, 403);
      const chk = await chainComplete(getExternalSupabase(), sid);
      if (!chk.ok) {
        console.warn("[issue-verify-token] linkvertise chain refused:", chk.reason, getIp(req));
        return json({ success: false, error: "steps_not_done", reason: chk.reason }, 403);
      }
      // one token per chain (primary key sid+step: a second request fails here)
      const { error: tErr } = await getExternalSupabase().from("verify_steps").insert({ sid, step: "token", ip: getIp(req) });
      if (tErr) return json({ success: false, error: "steps_not_done", reason: "used" }, 403);
    }

    const ip = getIp(req);
    const token = randomToken();
    const tokenHash = await sha256(token);
    // 30 min (was 10): after the offer they still pick a game, click the ad step and press Generate —
    // slower visitors lost the key they had just earned.
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

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
