import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Endpoint temporarily disabled
  return new Response(
    JSON.stringify({ error: "Account purchases are temporarily unavailable." }),
    { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );

  try {
    const { order_id, package_size, amount, user_id } = await req.json();
    if (!order_id || !package_size || !user_id) {
      return new Response(JSON.stringify({ error: "Missing required fields (order_id, package_size, user_id)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Capture PayPal payment
    const accessToken = await getPayPalAccessToken();
    const captureRes = await fetch(
      `https://api-m.paypal.com/v2/checkout/orders/${order_id}/capture`,
      { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` } }
    );
    const captureData = await captureRes.json();
    if (!captureRes.ok || captureData.status !== "COMPLETED") {
      return new Response(JSON.stringify({ error: "Payment not completed", details: captureData }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Insert purchase record
    const { data: purchase, error: pErr } = await supabase
      .from("roblox_account_purchases")
      .insert({
        user_id,
        package_size: Number(package_size),
        quantity: Number(package_size),
        amount: Number(amount) || 0,
        currency: "USD",
        payment_id: order_id,
        status: "completed",
      })
      .select()
      .single();

    if (pErr) {
      console.error("Purchase insert error:", pErr);
      return new Response(JSON.stringify({ error: "Failed to record purchase" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atomically claim accounts
    const { data: accounts, error: cErr } = await supabase.rpc("claim_accounts_for_purchase", {
      _user_id: user_id,
      _package_size: Number(package_size),
      _quantity: Number(package_size),
      _purchase_id: purchase.id,
    });

    if (cErr) {
      console.error("Claim error:", cErr);
      return new Response(JSON.stringify({ error: cErr.message || "Failed to claim accounts (out of stock)" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      status: "COMPLETED",
      purchase_id: purchase.id,
      delivered: accounts?.length || 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("paypal-capture-accounts error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
