import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extendKey, deactivateKey, transferKey, keyInfo } from "../_shared/shop-key-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "info" | "extend" | "deactivate" | "transfer";
const ADMIN_ACTIONS: Action[] = ["extend", "deactivate", "transfer"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, key, hours } = (await req.json().catch(() => ({}))) as {
      action?: Action; key?: string; hours?: number;
    };

    if (!action || !["info", "extend", "deactivate", "transfer"].includes(action)) {
      return json({ success: false, error: "Invalid action" }, 400);
    }
    if (!key || typeof key !== "string") {
      return json({ success: false, error: "key is required" }, 400);
    }
    if (action === "extend") {
      if (typeof hours !== "number" || hours < 1 || hours > 876000) {
        return json({ success: false, error: "hours must be a number between 1 and 876000" }, 400);
      }
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve caller from JWT
    let userId: string | null = null;
    let userEmail: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anon = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: u } = await anon.auth.getUser();
      userId = u.user?.id ?? null;
      userEmail = (u.user?.email ?? null)?.toLowerCase() ?? null;
    }

    let isAdmin = false;
    if (userId) {
      const { data: roleOk } = await service.rpc("has_role", { _user_id: userId, _role: "admin" });
      isAdmin = !!roleOk;
    }

    // Admin actions require admin role
    if (ADMIN_ACTIONS.includes(action) && !isAdmin) {
      return json({ success: false, error: "Forbidden: admin only" }, 403);
    }

    // info: admin OR owner of the key
    if (action === "info" && !isAdmin) {
      if (!userId) return json({ success: false, error: "Login required" }, 401);
      const { data: owned } = await service
        .from("premium_key_purchases")
        .select("id")
        .eq("key_generated", key)
        .or(`user_id.eq.${userId},customer_email.eq.${userEmail ?? "___none___"}`)
        .limit(1);
      if (!owned || owned.length === 0) {
        return json({ success: false, error: "You do not own this key" }, 403);
      }
    }

    let result;
    if (action === "info") result = await keyInfo(key);
    else if (action === "extend") result = await extendKey(key, hours!);
    else if (action === "deactivate") result = await deactivateKey(key);
    else result = await transferKey(key);

    // Keep DB expires_at in sync when an admin extends a key.
    if (action === "extend" && result.ok && result.data?.new_expires_at) {
      await service.from("premium_key_purchases")
        .update({ expires_at: result.data.new_expires_at })
        .eq("key_generated", key);
    }
    if (action === "deactivate" && result.ok) {
      await service.from("premium_key_purchases")
        .update({ status: "failed" })
        .eq("key_generated", key);
    }

    return json(result.data, result.ok ? 200 : result.status);
  } catch (error) {
    console.error("[shop-key] Error:", error);
    return json({ success: false, error: "Internal server error" }, 500);
  }

  function json(obj: unknown, status: number) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
