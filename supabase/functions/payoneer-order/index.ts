// payoneer-order (store, sqahviibykrzlwnulgmw)
// "Pay with Payoneer" in the /premium-keys checkout. Payoneer needs $20+, so only Lifetime (at today's sale price,
// same as PayPal) and the 60-day pack ($21.99).
// The buyer must be signed in with Discord: we save the order, then ask the bot (same project) to open a private
// ticket for them; staff send the Payoneer payment link there and Approve sends the key to their DMs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const LIFETIME = 49.99;

// ---- copy of src/lib/auto-key-discounts.ts (keep in sync) so the Payoneer lifetime price follows the store's sale ----
type AutoDiscount = { percent: number; label: string };

type Rule = {
  /** UTC weekdays this rule is active on (0 = Sunday). */
  days: number[];
  label: string;
  /** percent off per tier id */
  tiers: Record<string, number>;
};

// Deals run on the WEEKEND only (Fri → Sun UTC). Mon–Thu is full price — a sale that runs
// every day stops feeling like a sale (owner call, 2026-10-01). Flash/Mega bumps below only
// boost an active base deal, so they also only ever land on weekends.
const RULES: Rule[] = [
  {
    days: [5, 6, 0], // Friday → Sunday
    label: "Weekend Blowout",
    tiers: { monthly: 20, lifetime: 25 },
  },
];

/** Tiers that may never be auto-discounted. */
const EXCLUDED = new Set(["trial-7day"]);

// Hard ceilings per tier — a flash bump can never push past these, so the
// lifetime key never looks "cheap" no matter how the dice land.
const TIER_CAP: Record<string, number> = { monthly: 30, lifetime: 40 };

// ---- Surprise flash sales -------------------------------------------------
// A per-UTC-day deterministic "random" bump layered on top of the base day
// rule. Seeded by the calendar date, so every visitor sees the SAME deal that
// day and it's stable across refreshes (no Math.random at runtime). Feels
// unpredictable day-to-day — which keeps buyers from always waiting for the sale.
function daySeed(now: Date): number {
  const key = String(now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate());
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function rand01(seed: number, salt: number): number {
  let x = (seed ^ Math.imul(salt, 2654435761)) >>> 0;
  x ^= x << 13; x >>>= 0;
  x ^= x >> 17;
  x ^= x << 5; x >>>= 0;
  return (x >>> 0) / 4294967296;
}
function tierSalt(t: string): number { let h = 0; for (let i = 0; i < t.length; i++) h = (Math.imul(h, 31) + t.charCodeAt(i)) >>> 0; return h % 97; }

type Flash = { extra: number; label: string } | null;
function getFlash(tierId: string, now: Date): Flash {
  if (EXCLUDED.has(tierId)) return null;
  const seed = daySeed(now);
  // Mega day (~1 in 12): a bigger, rarer drop for word-of-mouth spikes.
  if (rand01(seed, 2) < 0.083) {
    const extra = 12 + Math.floor(rand01(seed, 30 + tierSalt(tierId)) * 8); // +12..+19
    return { extra, label: "🔥 Mega Sale" };
  }
  // Flash day (~1 in 3): a moderate surprise bump.
  if (rand01(seed, 1) < 0.33) {
    const extra = 5 + Math.floor(rand01(seed, 40 + tierSalt(tierId)) * 6); // +5..+10
    return { extra, label: "⚡ Flash Sale" };
  }
  return null;
}

function getAutoDiscount(tierId: string, now: Date = new Date()): AutoDiscount | null {
  if (EXCLUDED.has(tierId)) return null;
  const day = now.getUTCDay();
  let best: AutoDiscount | null = null;
  for (const rule of RULES) {
    if (!rule.days.includes(day)) continue;
    const percent = rule.tiers[tierId];
    if (!percent) continue;
    if (!best || percent > best.percent) best = { percent, label: rule.label };
  }

  // Flash sales only BOOST an already-active sale (the weekend) — they never create a
  // discount on a normal-price weekday. This keeps Mon–Thu at full price.
  if (best) {
    const flash = getFlash(tierId, now);
    if (flash) {
      const boosted = Math.min(best.percent + flash.extra, TIER_CAP[tierId] ?? 40);
      if (boosted > best.percent) best = { percent: boosted, label: flash.label };
    }
  }

  return best;
}
// ---- end copy ----

// today's lifetime price: the bigger of the admin discount and the automatic sale (same as the store's useKeyDiscounts)
async function lifetimePrice(admin: ReturnType<typeof createClient>) {
  const { data } = await admin.from("key_discounts").select("percent_off, active").eq("tier_id", "lifetime").maybeSingle();
  const pct = Math.max(data?.active ? Number(data.percent_off) || 0 : 0, getAutoDiscount("lifetime")?.percent ?? 0);
  return Math.max(20, Math.round(LIFETIME * (1 - pct / 100) * 100) / 100);
}
const out = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Pay now in the buyer's Discord card points here first (?go=<order>.<sig>, same HMAC as the bot's poSig): the first
// press starts the 30-minute "Verifying your payment" screen and pings staff, then we redirect to the Payoneer link.
async function poSig(id: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(Deno.env.get("DISCORD_CRON_SECRET") || ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode("po:" + id)));
  return [...s.slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function payNow(go: string) {
  const [id, sig] = go.split(".");
  const back = Response.redirect("https://keys.combowick.com/payoneer-order", 302);
  if (!/^\d+$/.test(id || "") || !sig || sig !== await poSig(id)) return back;
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: o } = await admin.from("payoneer_orders").select("status, payment_link, paid_claimed_at").eq("id", id).maybeSingle();
  if (!o?.payment_link || !["pending", "approving"].includes(o.status)) return back;
  if (!o.paid_claimed_at) {
    // @ts-ignore EdgeRuntime is a Supabase global
    EdgeRuntime.waitUntil(fetch(`${url}/functions/v1/discord-interactions?task=payoneer_click&id=${id}`, {
      method: "POST", headers: { "x-cw-cron": Deno.env.get("DISCORD_CRON_SECRET") || "" },
    }).catch(() => null));
  }
  return Response.redirect(o.payment_link, 302);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const go = new URL(req.url).searchParams.get("go");
  if (req.method === "GET" && go) return await payNow(go);
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
  const guild = Deno.env.get("DISCORD_GUILD_ID") || "";
  const ticketUrl = (ch: string) => `https://discord.com/channels/${guild}/${ch}`;
  // where the buyer's card is: their DMs, or a private ticket if their DMs were closed
  const cardUrl = (o: { dm_channel_id?: string | null; ticket_channel_id?: string | null }) =>
    o.dm_channel_id ? `https://discord.com/channels/@me/${o.dm_channel_id}` : o.ticket_channel_id ? ticketUrl(o.ticket_channel_id) : null;
  const latest = async () =>
    (await admin.from("payoneer_orders").select("*").eq("discord_id", discordId).order("id", { ascending: false }).limit(1)).data?.[0];

  // order page (/payoneer-order): the buyer's latest order. The payment link itself stays in Discord (Payoneer
  // doesn't allow payment links on a website). verifying = the server-side 30-minute window after Pay now, so a
  // refresh never restarts it; the key shows here once staff approve.
  if (body.action === "status") {
    const o = await latest();
    if (!o) return out({ order: null });
    const now = Date.now();
    const live = ["pending", "approving"].includes(o.status);
    return out({
      order: {
        id: o.id, plan: o.plan, price: Number(o.price), status: o.status, created_at: o.created_at,
        card: cardUrl(o), dm: !!o.dm_channel_id, link_ready: !!o.payment_link,
        pay_pressed: !!o.paid_claimed_at,
        verifying: live && !!o.paid_claimed_at && (!o.verify_until || now < new Date(o.verify_until).getTime()),
        temp_key: live ? o.temp_key : null,
        key: o.status === "approved" ? o.key_value : null,
      },
    });
  }

  // payment screenshot -> private bucket -> the bot posts it in the ticket with Approve / Deny
  if (body.action === "proof") {
    const m = String(body.image || "").match(/^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!m) return out({ error: "bad_image" });
    const bin = atob(m[3]);
    if (bin.length > 5 * 1024 * 1024) return out({ error: "too_big" });
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const o = await latest();
    if (!o || !["pending", "expired"].includes(o.status)) return out({ error: "no_order" });
    if ((o.proof_count ?? 0) >= 5) return out({ error: "too_many" });
    const file = `${o.id}/${Date.now()}.${m[2] === "jpeg" ? "jpg" : m[2]}`;
    const up = await admin.storage.from("payoneer-proofs").upload(file, bytes, { contentType: m[1] });
    if (up.error) return out({ error: "upload_failed" });
    const now = new Date().toISOString();
    await admin.from("payoneer_orders").update({
      proof_path: file, proof_at: now, paid_claimed_at: o.paid_claimed_at || now, proof_count: (o.proof_count ?? 0) + 1,
    }).eq("id", o.id);
    const r = await fetch(`${url}/functions/v1/discord-interactions?task=payoneer_proof&id=${o.id}`, {
      method: "POST", headers: { "x-cw-cron": Deno.env.get("DISCORD_CRON_SECRET") || "" },
    });
    const t = await r.json().catch(() => ({}));
    return out({ ok: true, posted: t.posted === 200 });
  }

  const plan = String(body.plan || "");
  const roblox = String(body.roblox || "").trim().slice(0, 32);
  if (plan !== "lifetime" && plan !== "60d") return out({ error: "bad_plan" });
  if (roblox && !/^[A-Za-z0-9_]{3,20}$/.test(roblox)) return out({ error: "bad_roblox" });

  // one open order per buyer: send them back to the card they already have
  const { data: open } = await admin.from("payoneer_orders").select("id, ticket_channel_id, dm_channel_id").eq("discord_id", discordId).in("status", ["pending", "approving"]).order("id", { ascending: false }).limit(1);
  if (open?.[0] && cardUrl(open[0])) return out({ ok: true, existing: true, order: open[0].id, ticket: cardUrl(open[0]), dm: !!open[0].dm_channel_id });

  const orderId = open?.[0]?.id ?? (await admin.from("payoneer_orders").insert({
    plan, price: plan === "lifetime" ? await lifetimePrice(admin) : 21.99, discord_id: discordId, discord_name: discordName, roblox_username: roblox || null, email: user.email || null, user_id: user.id,
  }).select("id").single()).data?.id;
  if (!orderId) return out({ error: "save_failed" });

  const r = await fetch(`${url}/functions/v1/discord-interactions?task=payoneer_order&id=${orderId}`, {
    method: "POST", headers: { "x-cw-cron": Deno.env.get("DISCORD_CRON_SECRET") || "" },
  });
  const t = await r.json().catch(() => ({}));
  if (t.channel) return out({ ok: true, order: orderId, ticket: t.dm ? `https://discord.com/channels/@me/${t.channel}` : ticketUrl(t.channel), dm: !!t.dm });
  if (t.error === "not_in_server") return out({ error: "not_in_server", invite: "https://discord.com/invite/ufrz9Zaqs8" });
  return out({ error: "ticket_failed" });
});
