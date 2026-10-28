// Trial win-back emails (owner-approved 2026-10-28). Service role only.
// A $5 trial buyer whose trial ENDED and who hasn't bought monthly/lifetime (same email) gets ONE email with their
// own single-use 20% code (minted in the key server DB, 7 days). Never twice (trial_winback_emails).
//   POST {}                       -> daily run (pg_cron): trials that ended in the last 3 days
//   POST { "mode": "backfill" }   -> every ended trial so far (the one-time send)
//   add "dry_run": true           -> list who would get it, send nothing
import { createClient } from "npm:@supabase/supabase-js@2";

const STORE = "https://keys.combowick.com/premium-keys";
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
function role(req: Request): string | null {
  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const own = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (own && (token === own || req.headers.get("apikey") === own)) return "service_role";
    const p = token.split(".")[1];
    return JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/"))).role ?? null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (role(req) !== "service_role") return json({ error: "Forbidden" }, 403);
  const body = await req.json().catch(() => ({}));
  const backfill = body?.mode === "backfill", dry = body?.dry_run === true;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = Date.now();

  const { data: rows, error } = await sb.from("premium_key_purchases")
    .select("customer_email, tier, status, expires_at, payment_id, created_at")
    .eq("status", "completed").not("customer_email", "is", null);
  if (error) return json({ error: error.message }, 500);
  const { data: sent } = await sb.from("trial_winback_emails").select("email");
  const { data: supp } = await sb.from("suppressed_emails").select("email");
  const skip = new Set([...(sent ?? []), ...(supp ?? [])].map((r: { email: string }) => r.email.toLowerCase()));
  const upgraded = new Set((rows ?? []).filter((r) => r.tier === "monthly" || r.tier === "lifetime").map((r) => r.customer_email.toLowerCase()));

  // latest trial per email
  const latest = new Map<string, { ends: number; payment_id: string }>();
  for (const r of rows ?? []) {
    if (r.tier !== "trial-7day" || !r.expires_at) continue;
    const e = r.customer_email.toLowerCase(), ends = Date.parse(r.expires_at);
    if (!latest.has(e) || latest.get(e)!.ends < ends) latest.set(e, { ends, payment_id: r.payment_id });
  }
  const due = [...latest].filter(([e, t]) =>
    t.ends < now && (backfill || now - t.ends < 3 * 86400e3) && !upgraded.has(e) && !skip.has(e));
  if (dry) return json({ mode: backfill ? "backfill" : "daily", count: due.length, emails: due.map(([e]) => e) });

  const exec = Deno.env.get("EXEC_SB_URL")!, execKey = Deno.env.get("EXEC_SB_SERVICE")!;
  const results: unknown[] = [];
  for (const [email, t] of due) {
    try {
      const r = await fetch(`${exec}/rest/v1/rpc/cw_mint_email_coupon`, {
        method: "POST", headers: { apikey: execKey, Authorization: `Bearer ${execKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_email: email }),
      });
      const c = await r.json();
      if (!c?.ok || c.used) { results.push({ email, skipped: c?.reason || "used" }); continue; }
      const expires = new Date(c.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      const { data: s, error: sErr } = await sb.functions.invoke("send-transactional-email", {
        body: {
          templateName: "trial-winback", recipientEmail: email, idempotencyKey: `trial-winback-${email}`,
          templateData: { code: c.code, expires, link: `${STORE}?promo=${encodeURIComponent(c.code)}` },
        },
      });
      if (sErr || !s?.queued) {
        // deno-lint-ignore no-explicit-any
        const ctx = (sErr as any)?.context;
        const detail = ctx ? `${ctx.status} ${(await ctx.text?.().catch(() => "")).slice(0, 200)}` : "";
        results.push({ email, error: (sErr?.message || s?.reason || "not queued") + (detail ? ` (${detail})` : "") });
        continue;
      }
      await sb.from("trial_winback_emails").insert({ email, code: c.code, payment_id: t.payment_id });
      results.push({ email, code: c.code });
    } catch (e) {
      results.push({ email, error: String(e) });
    }
  }
  return json({ mode: backfill ? "backfill" : "daily", count: due.length, results });
});
