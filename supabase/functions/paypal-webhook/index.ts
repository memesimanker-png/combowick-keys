import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extendKey, deactivateKey } from "../_shared/shop-key-api.ts";
import { acceptedPrices, bestPct, commissionFor, decodeOrderTag, lookupCreatorCode, lookupPromo, paidEnough, usePromo, withCode } from "../_shared/key-pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_API = "https://api-m.paypal.com";
const HWID_KEY_API = "https://v0-remix-of-roblox-executor-system.vercel.app/api/generate-hwid-key";

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// Verify the webhook signature with PayPal. Returns true when PayPal confirms it.
async function verifyWebhookSignature(req: Request, body: string, accessToken: string): Promise<boolean> {
  const webhookSecret = Deno.env.get("PAYPAL_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("[webhook] PAYPAL_WEBHOOK_SECRET not set");
    return false;
  }
  try {
    const verifyRes = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_algo: req.headers.get("paypal-auth-algo"),
        cert_url: req.headers.get("paypal-cert-url"),
        transmission_id: req.headers.get("paypal-transmission-id"),
        transmission_sig: req.headers.get("paypal-transmission-sig"),
        transmission_time: req.headers.get("paypal-transmission-time"),
        webhook_id: webhookSecret,
        webhook_event: JSON.parse(body),
      }),
    });
    const verifyData = await verifyRes.json();
    return verifyData.verification_status === "SUCCESS";
  } catch (e) {
    console.error("[webhook] signature verify threw:", e);
    return false;
  }
}

// Authoritative check straight from PayPal: confirm a capture is really COMPLETED
// and return its real amount/currency/email. This is the anti-spoof guarantee —
// even if the signature check fails (wrong webhook id, simulator, replay), a
// forged event cannot make us issue a key because PayPal itself must confirm it.
// Lowest legit price per key tier (deepest sale included). Same table as paypal-create-order.
const KEY_MIN_PRICE: Record<string, number> = { "trial-7day": 5, monthly: 6.49, lifetime: 24.99 };
// Orders we create that are NOT key purchases (their own capture functions handle them).
const isNonKeyOrder = (t: string | null) => !!t && (t === "donation" || t === "owner" || t.startsWith("topup-") || t === "other");
// deno-lint-ignore no-explicit-any
async function lockedOrderTooLow(supabase: any, tag: { tier: string | null; game: string | null; code: string | null; promo: string | null }, amount: number): Promise<boolean> {
  if (!tag.tier) return false;
  let acc = await acceptedPrices(supabase, tag.tier, tag.game);
  const cc = tag.code ? await lookupCreatorCode(supabase, tag.code, true) : null;
  const promo = tag.promo ? await lookupPromo(tag.promo, true) : null;
  if ((cc || promo) && acc) { const pct = bestPct(cc, promo); acc = acc.map((p) => withCode(p, pct)); }
  return !paidEnough(amount, acc);
}
// Monthly subscriptions: the plan's real price (the browser picks the amount when the plan is made).
async function fetchPlanPrice(planId: string, accessToken: string): Promise<number> {
  try {
    const res = await fetch(`${PAYPAL_API}/v1/billing/plans/${planId}`, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    if (!res.ok) return 0;
    const d = await res.json();
    const cyc = (d.billing_cycles || []).find((c: any) => c.tenure_type === "REGULAR") || d.billing_cycles?.[0];
    return parseFloat(cyc?.pricing_scheme?.fixed_price?.value || "0") || 0;
  } catch {
    return 0;
  }
}

async function fetchCapture(captureId: string, accessToken: string): Promise<
  { ok: true; status: string; amount: number; currency: string; email: string | null; customId: string | null } | { ok: false }
> {
  try {
    const res = await fetch(`${PAYPAL_API}/v2/payments/captures/${captureId}`, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    if (!res.ok) return { ok: false };
    const d = await res.json();
    return {
      ok: true,
      status: d.status,
      amount: parseFloat(d.amount?.value || "0"),
      currency: d.amount?.currency_code || "USD",
      email: d.payer?.email_address || null,
      customId: d.custom_id || null,
    };
  } catch (e) {
    console.error("[webhook] fetchCapture threw:", e);
    return { ok: false };
  }
}

async function fetchSubscription(subId: string, accessToken: string): Promise<
  { ok: true; status: string; email: string | null; planId: string | null } | { ok: false }
> {
  try {
    const res = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subId}`, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    if (!res.ok) return { ok: false };
    const d = await res.json();
    return { ok: true, status: d.status, email: d.subscriber?.email_address || null, planId: d.plan_id || null };
  } catch (e) {
    console.error("[webhook] fetchSubscription threw:", e);
    return { ok: false };
  }
}

async function generateKey(identifier: string, hours: number): Promise<string> {
  const res = await fetch(HWID_KEY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "x-cw-key-secret": Deno.env.get("KEY_API_SECRET") ?? "",   // key server auth
      Accept: "application/json",
    },
    body: JSON.stringify({ username: identifier, hours }),
  });
  if (!res.ok) throw new Error("Key generation failed");
  const data = await res.json();
  return data.key || data.licenseKey;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const event = JSON.parse(body);
    const eventType = event.event_type;

    console.log(`[webhook] Event: ${eventType}`);

    const accessToken = await getAccessToken();

    // Try the signature check. If it passes we trust the event outright. If it
    // FAILS we don't blindly reject anymore — instead we re-verify the money
    // path directly against PayPal's API below, so a real payment is never lost
    // to a misconfigured webhook id, while a forged event still can't issue keys.
    const signatureOk = await verifyWebhookSignature(req, body, accessToken);
    if (!signatureOk) {
      console.warn("[webhook] Signature NOT verified — falling back to PayPal API confirmation");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle payment capture completed (one-time purchases).
    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const capture = event.resource;
      const captureId = capture.id;
      const orderId = capture.supplementary_data?.related_ids?.order_id || captureId;

      // Authoritative confirmation from PayPal.
      const confirmed = await fetchCapture(captureId, accessToken);
      if (!confirmed.ok || confirmed.status !== "COMPLETED") {
        console.error(`[webhook] Capture ${captureId} not confirmed COMPLETED by PayPal — ignoring`);
        return new Response(JSON.stringify({ status: "ignored", reason: "unconfirmed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const amount = confirmed.amount;
      const email = confirmed.email;
      const tag = decodeOrderTag(confirmed.customId);
      const lockedTier = tag.tier;
      if (isNonKeyOrder(lockedTier)) {
        console.log(`[webhook] Capture ${captureId} is a ${lockedTier} order — not a key purchase, skipping`);
        return new Response(JSON.stringify({ status: "ignored", reason: "non-key-order" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const findRow = async () => (await supabase
        .from("premium_key_purchases")
        .select("id, tier, status, key_generated, customer_email")
        .eq("payment_id", orderId)
        .maybeSingle()).data;
      let existing = await findRow();
      // PayPal fires this webhook the moment the checkout captures, often before paypal-capture-order
      // has saved its row. Give the checkout a moment, so the buyer doesn't end up with two keys.
      if (!existing) {
        await new Promise((r) => setTimeout(r, 12000));
        existing = await findRow();
      }

      const floorTier = lockedTier || existing?.tier || null;
      const tooLow = lockedTier
        ? await lockedOrderTooLow(supabase, tag, amount)
        : !!floorTier && KEY_MIN_PRICE[floorTier] !== undefined && amount < KEY_MIN_PRICE[floorTier] - 0.001;
      if (existing && existing.status === "completed" && existing.key_generated) {
        console.log(`[webhook] Order ${orderId} already completed — skipping`);
      } else if (existing?.status === "underpaid" || tooLow) {
        console.warn(`[webhook] Order ${orderId} UNDERPAID (tier ${floorTier}, paid $${amount}) — no key`);
      } else {
        let tier = lockedTier || existing?.tier || "trial-7day";
        let hours = 72;
        if (lockedTier) {
          if (tier === "lifetime") hours = 876000;
          else if (tier === "monthly") hours = 720;
          else hours = 168;   // trial-7day = 7 days, same as the capture step
        } else if (!existing) {
          if (amount >= 40) { tier = "lifetime"; hours = 876000; }
          else if (amount >= 8) { tier = "monthly"; hours = 720; }
        } else {
          if (tier === "lifetime") hours = 876000;
          else if (tier === "monthly") hours = 720;
          else hours = 72;
        }

        const key = await generateKey(`PayPal-${orderId}`, hours);
        const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        const finalEmail = email || existing?.customer_email || null;

        if (existing) {
          await supabase.from("premium_key_purchases")
            .update({ key_generated: key, status: "completed", expires_at: expiresAt })
            .eq("id", existing.id);
        } else {
          const wcc = tag.code ? await lookupCreatorCode(supabase, tag.code, true) : null;
          await supabase.from("premium_key_purchases").insert({
            payment_id: orderId,
            tier,
            key_generated: key,
            amount,
            currency: confirmed.currency,
            status: "completed",
            customer_email: finalEmail,
            expires_at: expiresAt,
            creator_code: wcc?.code || null,
            creator_commission: commissionFor(wcc, amount, email),
          });
        }
        // a cleared eCheck that used a promo coupon burns it now (capture-order burns instant payments)
        if (tag.promo) await usePromo(tag.promo, orderId);

        if (finalEmail) {
          try {
            await supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "key-delivery",
                recipientEmail: finalEmail,
                templateData: {
                  premiumKey: key,
                  tier,
                  expiresAt: new Date(expiresAt).toLocaleDateString(),
                },
              },
            });
          } catch (e) {
            console.error("[webhook] key-delivery email failed:", e);
          }
        }

        console.log(`[webhook] Key issued for order ${orderId}: ${tier}`);
      }
    }

    // eCheck (or any capture) was denied/reversed — confirm with PayPal, then
    // mark the row failed AND revoke the key on the key server if one exists.
    if (eventType === "PAYMENT.CAPTURE.DENIED" || eventType === "PAYMENT.CAPTURE.REVERSED") {
      const capture = event.resource;
      const captureId = capture.id;
      const orderId = capture.supplementary_data?.related_ids?.order_id || captureId;

      const confirmed = await fetchCapture(captureId, accessToken);
      const reallyBad = !confirmed.ok || ["DECLINED", "FAILED", "REVERSED", "REFUNDED"].includes(confirmed.status);
      if (!reallyBad) {
        console.warn(`[webhook] Reversal event for ${captureId} but PayPal status is ${confirmed.ok ? confirmed.status : "unknown"} — not revoking`);
      } else {
        const { data: rows } = await supabase.from("premium_key_purchases")
          .select("id, key_generated")
          .eq("payment_id", orderId);

        for (const row of rows || []) {
          if (row.key_generated) {
            try {
              await deactivateKey(row.key_generated);
              console.log(`[webhook] Revoked key for reversed order ${orderId}`);
            } catch (e) {
              console.error("[webhook] deactivateKey failed:", e);
            }
          }
        }

        await supabase.from("premium_key_purchases")
          .update({ status: "failed" })
          .eq("payment_id", orderId)
          .in("status", ["pending", "completed"]);
        console.log(`[webhook] Capture ${orderId} denied/reversed`);
      }
    }

    // Subscription activated / renewed — confirm status ACTIVE with PayPal first.
    if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED" || eventType === "BILLING.SUBSCRIPTION.RENEWED") {
      const subId = event.resource.id;
      const confirmed = await fetchSubscription(subId, accessToken);
      if (!confirmed.ok || confirmed.status !== "ACTIVE") {
        console.error(`[webhook] Subscription ${subId} not confirmed ACTIVE — ignoring`);
        return new Response(JSON.stringify({ status: "ignored", reason: "sub-unconfirmed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const email = confirmed.email || event.resource.subscriber?.email_address || null;
      const planPrice = confirmed.planId ? await fetchPlanPrice(confirmed.planId, accessToken) : 0;
      if (planPrice < KEY_MIN_PRICE.monthly - 0.001) {
        console.warn(`[webhook] Subscription ${subId} plan price $${planPrice} below monthly minimum — no key`);
        return new Response(JSON.stringify({ status: "ignored", reason: "plan-underpriced" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await supabase.from("premium_key_purchases")
        .select("id, key_generated, expires_at")
        .eq("payment_id", subId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.key_generated) {
        let newExpiry: string | null = null;
        try {
          const ext = await extendKey(existing.key_generated, 720);
          newExpiry = ext.ok ? (ext.data?.new_expires_at || null) : null;
        } catch (e) {
          console.error("[webhook] extendKey on renewal failed:", e);
        }
        if (!newExpiry) {
          const base = existing.expires_at && new Date(existing.expires_at) > new Date()
            ? new Date(existing.expires_at) : new Date();
          newExpiry = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }
        await supabase.from("premium_key_purchases")
          .update({ status: "completed", expires_at: newExpiry })
          .eq("id", existing.id);
        console.log(`[webhook] Subscription ${subId} renewed — key extended to ${newExpiry}`);
      } else {
        const key = await generateKey(`Sub-${subId}`, 720);
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from("premium_key_purchases").insert({
          payment_id: subId,
          tier: "monthly",
          key_generated: key,
          amount: 8,
          currency: "USD",
          status: "completed",
          customer_email: email,
          expires_at: expiresAt,
        });
        console.log(`[webhook] Subscription key generated for ${subId}`);
      }
    }

    if (eventType === "BILLING.SUBSCRIPTION.CANCELLED" || eventType === "BILLING.SUBSCRIPTION.SUSPENDED") {
      const subId = event.resource.id;
      console.log(`[webhook] Subscription ${subId} cancelled/suspended`);
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[webhook] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
