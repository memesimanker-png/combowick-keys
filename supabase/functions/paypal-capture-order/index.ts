import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { acceptedPrices, commissionFor, decodeOrderTag, lookupCreatorCode, paidEnough, promoPctForOrder, withCode } from "../_shared/key-pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HWID_KEY_API = "https://v0-remix-of-roblox-executor-system.vercel.app/api/generate-hwid-key";

// Floor used only for orders created before the tier lock (no custom_id on the PayPal order).
const KEY_MIN_PRICE: Record<string, number> = { "trial-7day": 5, monthly: 6.49, lifetime: 24.99 };

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
      "x-cw-key-secret": Deno.env.get("KEY_API_SECRET") ?? "",   // key server auth
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

    // Inspect the actual capture status. eCheck (and some manual-review) payments
    // come back as PENDING and the money has NOT landed in the account yet.
    const unit = captureData?.purchase_units?.[0];
    const captureDetail = unit?.payments?.captures?.[0] || null;
    const captureStatus = captureDetail?.status || captureData?.status || null;
    const pendingReason = captureDetail?.status_details?.reason || null;

    // Trust PayPal, not the browser: the tier was locked into the order when it was created
    // (custom_id), and the amount is what PayPal actually charged. Orders created before the
    // tier lock fall back to the browser's tier, but still have to clear the price floor.
    const tag = decodeOrderTag(captureDetail?.custom_id || unit?.custom_id || null);
    const lockedTier = tag.tier;
    const usedTier = lockedTier || tier || "lifetime";
    const paid = parseFloat(captureDetail?.amount?.value || "0") || 0;

    const supabasePending = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Locked orders: must match the real price of that product (same math as the page).
    // Older unlocked orders: must at least clear the tier's floor.
    let underpaid: boolean;
    let keyFloor: unknown;
    // creator code locked into the order: discounted price + the creator's commission on what was paid
    const cc = tag.code ? await lookupCreatorCode(supabasePending, tag.code, true) : null;
    const creatorCode = cc?.code || null;
    const creatorCommission = commissionFor(cc, paid, captureData?.payer?.email_address);
    // promo coupon locked into the order: it only counts if it burns for THIS order now that PayPal has the money
    // (a code used by another order, or expired, gives no discount -> the order shows as underpaid)
    const moneyIn = captureStatus === "COMPLETED" || captureStatus === "PENDING";
    const promoPct = moneyIn ? await promoPctForOrder(tag.promo, order_id) : 0;
    // only USD orders are key products (a crafted order in another currency never matches a price)
    const usd = (captureDetail?.amount?.currency_code || "USD") === "USD";
    if (lockedTier) {
      let acc = usd ? await acceptedPrices(supabasePending, lockedTier, tag.game) : null;
      const pct = Math.max(cc?.discount_pct || 0, promoPct);
      if (pct && acc) acc = acc.map((p) => withCode(p, pct));
      keyFloor = acc;
      underpaid = !paidEnough(paid, acc);
    } else {
      keyFloor = KEY_MIN_PRICE[usedTier];
      underpaid = keyFloor === undefined || paid < (keyFloor as number) - 0.001;
    }

    const pendingEmail = customer_email || captureData.payer?.email_address || null;

    // Money moved but it doesn't match a key product (tampered price, or a donation/top-up order
    // pushed through the key capture): no key. Logged as "underpaid" so it can be reviewed/refunded.
    if ((captureStatus === "COMPLETED" || captureStatus === "PENDING") && underpaid) {
      console.warn(`[capture] UNDERPAID order ${order_id}: tier=${usedTier} locked=${lockedTier} game=${tag.game} paid=$${paid} expected=${JSON.stringify(keyFloor)}`);
      try {
        await supabasePending.from("premium_key_purchases").insert({
          payment_id: order_id,
          tier: usedTier,
          key_generated: "",
          amount: paid,
          currency: "USD",
          status: "underpaid",
          customer_email: pendingEmail,
          user_id: user_id || null,
          expires_at: null,
        });
      } catch (e) {
        console.error("[capture] underpaid insert failed:", e);
      }
      return new Response(JSON.stringify({ error: "The amount paid doesn't match this product. Contact support on Discord with your PayPal receipt." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            amount: paid,
            currency: "USD",
            status: "pending",
            creator_code: creatorCode,
            creator_commission: creatorCommission,
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
      amount: paid,
      currency: "USD",
      status: "completed",
      creator_code: creatorCode,
      creator_commission: creatorCommission,
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
