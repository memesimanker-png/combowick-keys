import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return new Response(JSON.stringify({
    client_id: Deno.env.get("PAYPAL_CLIENT_ID") || "",
    plan_id: Deno.env.get("PAYPAL_MONTHLY_PLAN_ID") || null,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
