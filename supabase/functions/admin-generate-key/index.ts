import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HWID_KEY_API = "https://v0-remix-of-roblox-executor-system.vercel.app/api/generate-hwid-key";

function getTierHours(tier: string, customHours?: number): number {
  if (tier === "custom" && customHours && customHours > 0) return Math.floor(customHours);
  if (tier === "trial-7day") return 72;
  if (tier === "monthly") return 720;
  return 876000;
}

function calculateExpiry(tier: string, customHours?: number): string {
  const now = new Date();
  if (tier === "custom" && customHours && customHours > 0) {
    return new Date(now.getTime() + Math.floor(customHours) * 60 * 60 * 1000).toISOString();
  }
  if (tier === "trial-7day") return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  if (tier === "monthly") return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
}

async function generateKeyFromAPI(tier: string, customHours?: number): Promise<string> {
  const hours = getTierHours(tier, customHours);
  const response = await fetch(HWID_KEY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
    },
    body: JSON.stringify({ username: `Admin-${Date.now()}`, hours }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[admin-key] External API error:", errText);
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tier, customer_email, custom_hours, custom_label, custom_amount } = await req.json();

    if (!tier) {
      return new Response(JSON.stringify({ error: "Missing tier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tier === "custom" && (!custom_hours || Number(custom_hours) < 1)) {
      return new Response(JSON.stringify({ error: "custom_hours required for custom tier (min 1)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hoursNum = tier === "custom" ? Math.floor(Number(custom_hours)) : undefined;
    const generatedKey = await generateKeyFromAPI(tier, hoursNum);
    const expiresAt = calculateExpiry(tier, hoursNum);

    const tierPrices: Record<string, number> = {
      "trial-7day": 5,
      "monthly": 9.99,
      "lifetime": 49.99,
    };

    const storedTier = tier === "custom"
      ? (custom_label?.trim() || `custom-${hoursNum}h`)
      : tier;
    const storedAmount = tier === "custom" ? (Number(custom_amount) || 0) : (tierPrices[tier] || 0);

    const { error: dbError } = await supabase.from("premium_key_purchases").insert({
      payment_id: `ADMIN-${Date.now()}`,
      tier: storedTier,
      key_generated: generatedKey,
      amount: storedAmount,
      currency: "USD",
      status: "completed",
      customer_email: customer_email || null,
      user_id: null,
      expires_at: expiresAt,
    });

    if (dbError) {
      return new Response(JSON.stringify({ error: "Database error", details: dbError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      key: generatedKey,
      expires_at: expiresAt,
      tier: storedTier,
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
