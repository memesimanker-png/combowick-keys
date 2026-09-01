import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_API = "https://api-m.paypal.com";
const HWID_KEY_API = "https://v0-remix-of-roblox-executor-system.vercel.app/api/generate-hwid-key";

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;
  const auth = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
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

async function generateKeyFromAPI(subscriptionId: string): Promise<string> {
  const response = await fetch(HWID_KEY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
    },
    body: JSON.stringify({ username: `Sub-${subscriptionId}`, hours: 720 }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[subscription] External API error:", errText);
    throw new Error("Failed to generate key from external API");
  }

  const data = await response.json();
  return data.key || data.licenseKey;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { subscription_id, tier, amount, customer_email, user_id } = await req.json();

    if (!subscription_id) {
      return new Response(JSON.stringify({ error: "Missing subscription_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the REAL subscription status with PayPal before issuing a key.
    // eCheck first payments leave the subscription in APPROVAL_PENDING — the money
    // has NOT landed yet, so we must not hand over a key.
    const accessToken = await getPayPalAccessToken();
    const subRes = await fetch(
      `${PAYPAL_API}/v1/billing/subscriptions/${subscription_id}`,
      { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
    );
    const subData = await subRes.json();
    const subStatus = subData?.status || null;

    const finalEmail = customer_email || subData?.subscriber?.email_address || null;

    // Only ACTIVE means the first cycle was actually collected.
    if (subStatus !== "ACTIVE") {
      // Record a pending purchase so it shows in the dashboard. The webhook
      // (BILLING.SUBSCRIPTION.ACTIVATED) issues + emails the key once funds clear.
      try {
        const { data: existing } = await supabase
          .from("premium_key_purchases")
          .select("id")
          .eq("payment_id", subscription_id)
          .maybeSingle();
        if (!existing) {
          await supabase.from("premium_key_purchases").insert({
            payment_id: subscription_id,
            tier: tier || "monthly",
            key_generated: "",
            amount: Number(amount) || 8,
            currency: "USD",
            status: "pending",
            customer_email: finalEmail,
            user_id: user_id || null,
            expires_at: null,
          });
        }
      } catch (e) {
        console.error("[subscription] pending insert failed:", e);
      }

      return new Response(JSON.stringify({
        status: "PENDING",
        pending: true,
        reason: subStatus || "NOT_ACTIVE",
        message: "Your subscription payment is still clearing (eCheck). Your key will be emailed and added to your dashboard as soon as the funds clear — usually within a few business days.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Subscription is ACTIVE — money collected. Reuse an existing pending row if any.
    const { data: existing } = await supabase
      .from("premium_key_purchases")
      .select("id, key_generated, status")
      .eq("payment_id", subscription_id)
      .maybeSingle();

    if (existing && existing.status === "completed" && existing.key_generated) {
      return new Response(JSON.stringify({
        status: "COMPLETED",
        key: existing.key_generated,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        tier: "monthly",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const generatedKey = await generateKeyFromAPI(subscription_id);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (existing) {
      await supabase.from("premium_key_purchases")
        .update({ key_generated: generatedKey, status: "completed", expires_at: expiresAt })
        .eq("id", existing.id);
    } else {
      await supabase.from("premium_key_purchases").insert({
        payment_id: subscription_id,
        tier: tier || "monthly",
        key_generated: generatedKey,
        amount: Number(amount) || 8,
        currency: "USD",
        status: "completed",
        customer_email: finalEmail,
        user_id: user_id || null,
        expires_at: expiresAt,
      });
    }

    return new Response(JSON.stringify({
      status: "COMPLETED",
      key: generatedKey,
      expires_at: expiresAt,
      tier: "monthly",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
