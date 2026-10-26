// payoneer-order (store, sqahviibykrzlwnulgmw)
// "Pay with Payoneer" on /premium-keys. Payoneer needs $20+, so only Lifetime ($49.99) and the 90-day pack ($20).
// The buyer must be signed in with Discord: we save the order, then ask the bot (same project) to open a private
// ticket for them; staff send the Payoneer payment request there and Approve sends the key to their DMs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const PLANS: Record<string, number> = { lifetime: 49.99, "90d": 20 };
const out = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ error: "method" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(jwt);
  const user = auth?.user;
  if (!user) return out({ error: "sign_in" });
  const disc = (user.identities || []).find((x) => x.provider === "discord");
  const discordId = String(disc?.identity_data?.provider_id || disc?.id || "");
  if (!/^\d{15,22}$/.test(discordId)) return out({ error: "discord_required" });
  const discordName = String(disc?.identity_data?.full_name || disc?.identity_data?.name || user.user_metadata?.full_name || "").slice(0, 64);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const plan = String(body.plan || "");
  const email = String(body.email || "").trim().slice(0, 200);
  const roblox = String(body.roblox || "").trim().slice(0, 32);
  if (!PLANS[plan]) return out({ error: "bad_plan" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return out({ error: "bad_email" });
  if (roblox && !/^[A-Za-z0-9_]{3,20}$/.test(roblox)) return out({ error: "bad_roblox" });

  const guild = Deno.env.get("DISCORD_GUILD_ID") || "";
  const ticketUrl = (ch: string) => `https://discord.com/channels/${guild}/${ch}`;

  // one open order per buyer: send them back to the ticket they already have
  const { data: open } = await admin.from("payoneer_orders").select("id, ticket_channel_id").eq("discord_id", discordId).in("status", ["pending", "approving"]).order("id", { ascending: false }).limit(1);
  if (open?.[0]?.ticket_channel_id) return out({ ok: true, existing: true, order: open[0].id, ticket: ticketUrl(open[0].ticket_channel_id) });

  const orderId = open?.[0]?.id ?? (await admin.from("payoneer_orders").insert({
    plan, price: PLANS[plan], discord_id: discordId, discord_name: discordName, roblox_username: roblox || null, email, user_id: user.id,
  }).select("id").single()).data?.id;
  if (!orderId) return out({ error: "save_failed" });

  const r = await fetch(`${url}/functions/v1/discord-interactions?task=payoneer_order&id=${orderId}`, {
    method: "POST", headers: { "x-cw-cron": Deno.env.get("DISCORD_CRON_SECRET") || "" },
  });
  const t = await r.json().catch(() => ({}));
  if (t.channel) return out({ ok: true, order: orderId, ticket: ticketUrl(t.channel) });
  if (t.error === "not_in_server") return out({ error: "not_in_server", invite: "https://discord.com/invite/ufrz9Zaqs8" });
  return out({ error: "ticket_failed" });
});
