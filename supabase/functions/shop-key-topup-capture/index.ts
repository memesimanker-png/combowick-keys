import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extendKey, keyInfo } from "../_shared/shop-key-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_API = "https://api-m.paypal.com";

// Allowed top-up packs (price -> hours). Server-side source of truth.
const PACKS: Record<string, { hours: number; price: number; label: string }> = {
  "7d": { hours: 168, price: 3, label: "+7 Days" },
  "30d": { hours: 720, price: 8, label: "+30 Days" },
};

async function getAccessToken(): Promise<string> {
  const auth = btoa(`${Deno.env.get("PAYPAL_CLIENT_ID")}:${Deno.env.get("PAYPAL_CLIENT_SECRET")}`);
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error("PayPal auth failed");
  return data.access_token;
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { order_id, key, pack } = (await req.json().catch(() => ({}))) as {
      order_id?: string; key?: string; pack?: string;
    };

    if (!order_id || !key || !pack || !PACKS[pack]) {
      return json({ error: "Missing or invalid order_id / key / pack" }, 400);
    }
    const { hours, price } = PACKS[pack];

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the key exists / is active before charging value.
    const info = await keyInfo(key);
    if (!info.ok) return json({ error: "Key not found on key server" }, 404);

    // Capture the PayPal payment.
    const accessToken = await getAccessToken();
    const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${order_id}/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    });
    const captureData = await captureRes.json();
    const detail = captureData?.purchase_units?.[0]?.payments?.captures?.[0] || null;
    const captureStatus = detail?.status || captureData?.status || null;

    if (captureStatus !== "COMPLETED") {
      // eCheck / pending: do NOT extend until cleared. (Top-ups are small; we keep it simple.)
      return json({
        status: "PENDING",
        message: "Payment is still clearing. Your hours will be added once it completes.",
      });
    }

    // Money in hand — extend the key.
    const ext = await extendKey(key, hours);
    if (!ext.ok) {
      return json({ error: ext.data?.error || "Failed to extend key", paid: true }, 502);
    }

    const newExpiry = ext.data?.new_expires_at || null;
    if (newExpiry) {
      await service.from("premium_key_purchases")
        .update({ expires_at: newExpiry })
        .eq("key_generated", key);
    }

    // Log the top-up as its own completed purchase row for history/revenue.
    const email = captureData?.payer?.email_address || null;
    await service.from("premium_key_purchases").insert({
      payment_id: order_id,
      tier: `topup-${pack}`,
      key_generated: key,
      amount: price,
      currency: "USD",
      status: "completed",
      customer_email: email,
      expires_at: newExpiry,
    });

    return json({
      status: "COMPLETED",
      key,
      hours_added: hours,
      new_expires_at: newExpiry,
    });
  } catch (error) {
    console.error("[shop-key-topup-capture] Error:", error);
    return json({ error: String(error) }, 500);
  }
});
