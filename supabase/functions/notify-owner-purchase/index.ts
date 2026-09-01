import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Pings the owner's Discord (@everyone x2) when someone buys Owner/Admin access.
// The webhook URL is a SERVER SECRET (never shipped to the browser). The payment
// is re-verified against PayPal here, so a client can't spoof a fake purchase ping.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OWNER_AMOUNT = 1000;

async function paypalToken(): Promise<string> {
  const id = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;
  const res = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { order_id, discord_username } = await req.json();
    const username = String(discord_username || "").slice(0, 80).trim();
    if (!order_id || !username) {
      return new Response(JSON.stringify({ error: "Missing order_id or discord_username" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webhook = Deno.env.get("OWNER_DISCORD_WEBHOOK");
    if (!webhook) {
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Re-verify the payment with PayPal so this can't be spoofed from the client.
    const token = await paypalToken();
    const orderRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${order_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const order = await orderRes.json();
    const status = order?.status;
    const captured = order?.purchase_units?.[0]?.payments?.captures?.[0]?.status;
    const value = Number(order?.purchase_units?.[0]?.amount?.value || order?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || 0);
    const paid = (status === "COMPLETED" || captured === "COMPLETED") && value >= OWNER_AMOUNT - 1;
    if (!paid) {
      return new Response(JSON.stringify({ error: "Payment not verified", status, value }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safe = username.replace(/[`@]/g, ""); // avoid breaking markdown / stray pings on the name
    const post = (body: unknown) =>
      fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    // Ping #1 — rich announcement.
    await post({
      content: "@everyone",
      allowed_mentions: { parse: ["everyone"] },
      embeds: [{
        title: "👑 NEW OWNER / ADMIN PURCHASE",
        description: `**${safe}** just bought **Owner/Admin access** ($${OWNER_AMOUNT}, 5 months).`,
        color: 0xFFD400,
        fields: [
          { name: "Discord", value: safe, inline: true },
          { name: "Amount", value: `$${OWNER_AMOUNT} USD`, inline: true },
          { name: "PayPal Order", value: String(order_id), inline: false },
        ],
      }],
    });

    // Ping #2 — second @everyone so it notifies twice, as requested.
    await post({
      content: `@everyone 👑 Set up **${safe}** with their Owner/Admin role — 5 month term.`,
      allowed_mentions: { parse: ["everyone"] },
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
