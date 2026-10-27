import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Lowest price each product can legitimately be sold for (deepest weekend/flash sale included).
// The browser sends the amount, so anything below this is a tampered request: refuse it before
// PayPal ever sees it. The tier is also locked into the order (custom_id) so the capture step
// reads it from PayPal instead of trusting the browser a second time.
// NOTE: paid-game scripts (lifetime $11.99/$17) are hidden right now; unhiding them needs the
// exact-price check, not just these floors.
const MIN_PRICE: Record<string, number> = {
  "trial-7day": 5,
  monthly: 6.49,
  lifetime: 24.99,
  "topup-7d": 3,
  "topup-30d": 8,
  owner: 500,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { amount, description, tier } = await req.json();

    if (!amount || isNaN(Number(amount)) || Number(amount) < 1) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const orderTier = String(tier || "other").slice(0, 100);
    const floor = MIN_PRICE[orderTier];
    if (floor !== undefined && Number(amount) < floor - 0.001) {
      console.warn(`[create-order] refused ${orderTier} at $${amount} (min $${floor})`);
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
          custom_id: orderTier,
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
