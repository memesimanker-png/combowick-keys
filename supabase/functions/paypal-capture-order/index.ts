import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HWID_KEY_API = "https://v0-remix-of-roblox-executor-system.vercel.app/api/generate-hwid-key";

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

function getTierHours(tier: string): number {
  if (tier === "trial-7day") return 168; // 7 days
  if (tier === "monthly") return 720;
  return 876000; // lifetime
}

function calculateExpiry(tier: string): string {
  const now = new Date();
  if (tier === "trial-7day") return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  if (tier === "monthly") return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
}

async function generateKeyFromAPI(tier: string, paymentId: string): Promise<string> {
  const hours = getTierHours(tier);
  const response = await fetch(HWID_KEY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
    },
    body: JSON.stringify({ username: `PayPal-${paymentId}`, hours }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[capture] External API error:", errText);
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
    const { order_id, tier, amount, customer_email, user_id } = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getPayPalAccessToken();

    const captureRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${order_id}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const captureData = await captureRes.json();

    const usedTier = tier || "lifetime";

    // Inspect the actual capture status. eCheck (and some manual-review) payments
    // come back as PENDING and the money has NOT landed in the account yet.
    const captureDetail =
      captureData?.purchase_units?.[0]?.payments?.captures?.[0] || null;
    const captureStatus = captureDetail?.status || captureData?.status || null;
    const pendingReason = captureDetail?.status_details?.reason || null;

    const supabasePending = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const pendingEmail = customer_email || captureData.payer?.email_address || null;

    // Payment not (yet) money-in-hand: do NOT generate or hand over a key.
    if (captureStatus !== "COMPLETED") {
      if (captureStatus === "PENDING") {
        // Record a pending purchase so the buyer + admin can see it. The key is
        // generated and emailed later by the PayPal webhook once the eCheck clears.
        try {
          await supabasePending.from("premium_key_purchases").insert({
            payment_id: order_id,
            tier: usedTier,
            key_generated: "",
            amount: Number(amount) || 0,
            currency: "USD",
            status: "pending",
            customer_email: pendingEmail,
            user_id: user_id || null,
            expires_at: null,
          });
        } catch (e) {
          console.error("[capture] pending insert failed:", e);
        }

        return new Response(JSON.stringify({
          status: "PENDING",
          pending: true,
          reason: pendingReason || "ECHECK",
          message: "Payment is still clearing (eCheck). Your key will be emailed and added to your dashboard as soon as the funds clear — usually within a few business days.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Payment not completed", details: captureData }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const generatedKey = await generateKeyFromAPI(usedTier, order_id);
    const expiresAt = calculateExpiry(usedTier);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const finalEmail = customer_email || captureData.payer?.email_address || null;

    // If client didn't pass user_id, try to resolve it from the email so the
    // dashboard can show this purchase to the buyer after they log in.
    let resolvedUserId: string | null = user_id || null;
    if (!resolvedUserId && finalEmail) {
      try {
        const { data: usersList } = await supabase.auth.admin.listUsers();
        const match = usersList?.users?.find(
          (u: any) => (u.email || "").toLowerCase() === String(finalEmail).toLowerCase()
        );
        if (match) resolvedUserId = match.id;
      } catch (e) {
        console.error("[capture] user lookup failed:", e);
      }
    }

    const { error: dbError } = await supabase.from("premium_key_purchases").insert({
      payment_id: order_id,
      tier: usedTier,
      key_generated: generatedKey,
      amount: Number(amount) || 0,
      currency: "USD",
      status: "completed",
      customer_email: finalEmail,
      user_id: resolvedUserId,
      expires_at: expiresAt,
    });

    if (dbError) {
      console.error("DB insert error:", dbError);
    }

    return new Response(JSON.stringify({
      status: "COMPLETED",
      key: generatedKey,
      expires_at: expiresAt,
      tier: usedTier,
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
