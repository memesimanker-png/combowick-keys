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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { amount } = await req.json();
    if (!amount || isNaN(Number(amount)) || Number(amount) < 1) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getPayPalAccessToken();
    const amountStr = Number(amount).toFixed(2);

    // Check if we have a pre-configured plan ID for the monthly tier
    const monthlyPlanId = Deno.env.get("PAYPAL_MONTHLY_PLAN_ID");
    if (monthlyPlanId && Number(amount) === 8) {
      return new Response(JSON.stringify({ plan_id: monthlyPlanId, amount: amountStr }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a product
    const productRes = await fetch("https://api-m.paypal.com/v1/catalogs/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: `ComboWick Premium — $${amountStr}/mo`,
        description: `Monthly premium subscription at $${amountStr} per month`,
        type: "SERVICE",
        category: "SOFTWARE",
      }),
    });

    if (!productRes.ok) {
      const err = await productRes.text();
      return new Response(JSON.stringify({ error: "Failed to create product", details: err }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const product = await productRes.json();

    // Create billing plan
    const planRes = await fetch("https://api-m.paypal.com/v1/billing/plans", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        product_id: product.id,
        name: `Monthly Premium $${amountStr}`,
        description: `Monthly subscription of $${amountStr}/month to ComboWick`,
        billing_cycles: [{
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: amountStr, currency_code: "USD" },
          },
        }],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee: { value: "0", currency_code: "USD" },
          setup_fee_failure_action: "CONTINUE",
          payment_failure_threshold: 3,
        },
      }),
    });

    if (!planRes.ok) {
      const err = await planRes.text();
      return new Response(JSON.stringify({ error: "Failed to create plan", details: err }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = await planRes.json();

    // Activate if not already active
    if (plan.status !== "ACTIVE") {
      await fetch(`https://api-m.paypal.com/v1/billing/plans/${plan.id}/activate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }

    return new Response(JSON.stringify({ plan_id: plan.id, amount: amountStr }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
