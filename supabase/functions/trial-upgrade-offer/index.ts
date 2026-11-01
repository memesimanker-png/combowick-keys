// Thank-you offer for a $5 trial buyer: their own single-use 20% code, shown on the success screen right after paying.
// Only for a completed trial order from the last hour, by order id (which only the buyer's checkout knows).
// One code per email per 30 days, kind "upgrade", so it never touches the win-back email's code.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const body = await req.json().catch(() => ({}));
  const orderId = String(body?.order_id || "");
  if (!/^[A-Za-z0-9-]{6,64}$/.test(orderId)) return json({ ok: false, reason: "bad_order" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: order } = await sb.from("premium_key_purchases")
    .select("customer_email, tier, status, created_at")
    .eq("payment_id", orderId).maybeSingle();
  if (!order || order.status !== "completed" || order.tier !== "trial-7day" || !order.customer_email) return json({ ok: false, reason: "not_eligible" });
  if (Date.now() - Date.parse(order.created_at) > 3600e3) return json({ ok: false, reason: "too_late" });

  const email = order.customer_email.toLowerCase();
  const { count } = await sb.from("premium_key_purchases").select("id", { count: "exact", head: true })
    .eq("status", "completed").in("tier", ["monthly", "lifetime"]).ilike("customer_email", email);
  if (count) return json({ ok: false, reason: "already_paid" });

  const exec = Deno.env.get("EXEC_SB_URL")!, execKey = Deno.env.get("EXEC_SB_SERVICE")!;
  const r = await fetch(`${exec}/rest/v1/rpc/cw_mint_upgrade_coupon`, {
    method: "POST", headers: { apikey: execKey, Authorization: `Bearer ${execKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_email: email }),
  });
  const c = await r.json().catch(() => null);
  if (!c?.ok || c.used) return json({ ok: false, reason: c?.reason || "no_code" });
  return json({ ok: true, code: c.code, pct: c.pct, expires_at: c.expires_at });
});
