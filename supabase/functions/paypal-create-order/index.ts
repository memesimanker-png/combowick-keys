import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { acceptedPrices, BASE_PRICE, bestPct, CODE_TIERS, encodeOrderTag, lookupCreatorCode, lookupPromo, paidEnough, withCode } from "../_shared/key-pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;
  const auth = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// The browser sends the amount, so it is checked here before PayPal ever sees it:
// key products must match today's real price (_shared/key-pricing.ts, same math as the page);
// top-ups / owner have fixed prices. The tier (+ game) is also locked into the order (custom_id)
// so the capture step reads it from PayPal instead of trusting the browser a second time.
const FIXED_MIN: Record<string, number> = { "topup-7d": 3, "topup-30d": 8, owner: 500 };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { amount, description, tier, game, creator_code, promo_code } = await req.json();

    if (!amount || isNaN(Number(amount)) || Number(amount) < 1) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const orderTier = String(tier || "other").slice(0, 60);
    const gameKey = typeof game === "string" && game ? game.slice(0, 60) : null;
    let ok = true, expected: unknown = null;
    let codeUsed: string | null = null;
    let promoUsed: string | null = null;
    if (orderTier in BASE_PRICE || gameKey) {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      let acc = await acceptedPrices(sb, orderTier, gameKey);
      // creator code / promo coupon: Premium monthly/lifetime only; an unknown/expired/used code is refused
      // (the page checks it first). Both given: the bigger discount wins.
      if ((creator_code || promo_code) && !gameKey && CODE_TIERS.has(orderTier)) {
        const cc = creator_code ? await lookupCreatorCode(sb, creator_code) : null;
        const promo = promo_code ? await lookupPromo(promo_code) : null;
        if ((creator_code && !cc) || (promo_code && !promo)) {
          return new Response(JSON.stringify({ error: promo_code && !promo ? "Invalid promo code" : "Invalid creator code" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        codeUsed = cc?.code || null;
        promoUsed = promo?.code || null;
        const pct = bestPct(cc, promo);
        acc = acc ? acc.map((p) => withCode(p, pct)) : acc;
      }
      expected = acc;
      ok = paidEnough(Number(amount), acc);
    } else if (FIXED_MIN[orderTier] !== undefined) {
      expected = FIXED_MIN[orderTier];
      ok = Number(amount) >= FIXED_MIN[orderTier] - 0.001;
    }
    if (!ok) {
      console.warn(`[create-order] refused ${orderTier}${gameKey ? " / " + gameKey : ""} at $${amount} (expected ${JSON.stringify(expected)})`);
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getPayPalAccessToken();

    const orderRes = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          custom_id: encodeOrderTag(orderTier, gameKey, codeUsed, promoUsed),
          amount: { currency_code: "USD", value: Number(amount).toFixed(2) },
          description: description || `ComboWick Premium Key - ${tier || "Purchase"}`,
        }],
      }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to create order", details: orderData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ order_id: orderData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
