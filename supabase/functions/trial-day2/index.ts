// Day-2 email for a $5 trial buyer: what's new while their Premium is still running, plus their own 20% code.
// Most trial keys stop being used after the first day, and the win-back email only goes out once the trial has ended.
// One email per address, never twice (trial_day2_emails), never to someone who already bought monthly/lifetime.
//   POST {}                  -> daily run (pg_cron): trials bought 48-72 hours ago
//   POST { "dry_run": true } -> how many would get it + the games it would list, sends nothing
import { createClient } from "npm:@supabase/supabase-js@2";

const STORE = "https://keys.combowick.com/premium-keys";
const HIDE = new Set(["9271746647"]);   // internal test game
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
  const dry = body?.dry_run === true;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const exec = Deno.env.get("EXEC_SB_URL")!, execKey = Deno.env.get("EXEC_SB_SERVICE")!;
  const execHeaders = { apikey: execKey, Authorization: `Bearer ${execKey}`, "Content-Type": "application/json" };
  const now = Date.now();

  const { data: rows, error } = await sb.from("premium_key_purchases")
    .select("customer_email, tier, status, expires_at, payment_id, created_at")
    .eq("status", "completed").not("customer_email", "is", null);
  if (error) return json({ error: error.message }, 500);
  const { data: sent } = await sb.from("trial_day2_emails").select("email");
  const { data: supp } = await sb.from("suppressed_emails").select("email");
  const skip = new Set([...(sent ?? []), ...(supp ?? [])].map((r: { email: string }) => r.email.toLowerCase()));
  const upgraded = new Set((rows ?? []).filter((r) => r.tier === "monthly" || r.tier === "lifetime").map((r) => r.customer_email.toLowerCase()));

  const due = new Map<string, { payment_id: string; expires: number }>();
  for (const r of rows ?? []) {
    if (r.tier !== "trial-7day" || !r.expires_at) continue;
    const age = now - Date.parse(r.created_at), e = r.customer_email.toLowerCase();
    if (age >= 48 * 3600e3 && age < 72 * 3600e3 && !upgraded.has(e) && !skip.has(e)) due.set(e, { payment_id: r.payment_id, expires: Date.parse(r.expires_at) });
  }

  // the newest games added in the last 7 days: the reason to come back while the trial is still running
  let games: string[] = [];
  try {
    const g = await (await fetch(`${exec}/rest/v1/rpc/cw_games_list`, { method: "POST", headers: execHeaders, body: "{}" })).json();
    games = (Array.isArray(g) ? g : [])
      .filter((x: { a?: string; u?: string; n?: string }) => x.n && x.a && !HIDE.has(String(x.u)) && now - Date.parse(x.a) < 7 * 86400e3)
      .sort((x: { a: string }, y: { a: string }) => Date.parse(y.a) - Date.parse(x.a))
      .slice(0, 3).map((x: { n: string }) => x.n);
  } catch { /* the email still works without the list */ }
  if (dry) return json({ dry_run: true, count: due.size, games });

  const results: unknown[] = [];
  for (const [email, t] of due) {
    try {
      const r = await fetch(`${exec}/rest/v1/rpc/cw_mint_upgrade_coupon`, { method: "POST", headers: execHeaders, body: JSON.stringify({ p_email: email }) });
      const c = await r.json();
      if (!c?.ok || c.used) { results.push({ skipped: c?.reason || "used" }); continue; }
      const daysLeft = Math.max(1, Math.ceil((t.expires - now) / 86400e3));
      const expires = new Date(c.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      const { data: s, error: sErr } = await sb.functions.invoke("send-transactional-email", {
        body: {
          templateName: "trial-day2", recipientEmail: email, idempotencyKey: `trial-day2-${email}`,
          templateData: { code: c.code, expires, daysLeft, games, link: `${STORE}?promo=${encodeURIComponent(c.code)}&src=email-day2` },
        },
      });
      if (sErr || !s?.queued) { results.push({ error: sErr?.message || s?.reason || "not queued" }); continue; }
      await sb.from("trial_day2_emails").insert({ email, code: c.code, payment_id: t.payment_id });
      results.push({ sent: true });
    } catch (e) {
      results.push({ error: String(e) });
    }
  }
  return json({ count: due.size, results });
});
