import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { keyInfo } from "../_shared/shop-key-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ORIGINS = [
  "https://shop-ready.lovable.app",
  "https://combowick.com",
  "https://www.combowick.com",
  "https://keys.combowick.com",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const h = new URL(origin).hostname;
    // lovable preview/sandbox subdomains + this project's Vercel domains (prod + previews)
    return /.lovable.app$/.test(h) || /^combowick-keys[w-]*.vercel.app$/.test(h);
  } catch {
    return false;
  }
}

function getIp(req: Request): string {
  // 2026-11-19: Cloudflare's header first. The first x-forwarded-for entry can be sent by the client, so a fake one
  // gave a fresh 5-keys-per-IP quota on every request.
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const fwd = req.headers.get("x-forwarded-for") || "";
  const parts = fwd.split(",").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || "unknown";
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const origin = req.headers.get("origin");
    if (!isAllowedOrigin(origin)) {
      console.warn("[start-key-extension] blocked origin:", origin);
      return json({ success: false, error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const { key, hwid } = body as { key?: string; hwid?: string };

    if (!key || typeof key !== "string" || key.trim().length < 4) {
      return json({ success: false, error: "A valid key is required." }, 400);
    }
    if (!hwid || typeof hwid !== "string" || hwid.length < 8) {
      return json({ success: false, error: "A valid device identifier is required." }, 400);
    }

    const ip = getIp(req);
    const cleanKey = key.trim();

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // TASK 4 (anti-abuse): rate-limit extension starts per HWID.
    // Max 1 pending start per 20s, max 6 completed extensions per key per 24h.
    const twentySecAgo = new Date(Date.now() - 20 * 1000).toISOString();
    const { count: recentStarts } = await service
      .from("key_extensions")
      .select("id", { count: "exact", head: true })
      .eq("hwid", hwid)
      .gte("created_at", twentySecAgo);
    if ((recentStarts ?? 0) >= 1) {
      return json({ success: false, error: "Please wait a few seconds before trying again." }, 429);
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: dailyDone } = await service
      .from("key_extensions")
      .select("id", { count: "exact", head: true })
      .eq("key_value", cleanKey)
      .eq("status", "completed")
      .gte("completed_at", dayAgo);
    if ((dailyDone ?? 0) >= 6) {
      return json({ success: false, error: "Daily extension limit reached for this key." }, 429);
    }

    // Verify the key actually exists on the external key server before we bother.
    const info = await keyInfo(cleanKey);
    if (!info.ok || info.data?.success === false) {
      return json({ success: false, error: "Key not found. Check your key and try again." }, 404);
    }

    // 2026-11-19: Add Hours is for FREE keys only. Premium / all-access / account-bound keys could be kept alive
    // forever with free checkpoints (no rebuy), and a key the owner deactivated came back on (extend sets is_active).
    {
      const execUrl = Deno.env.get("EXEC_SB_URL"), execKey = Deno.env.get("EXEC_SB_SERVICE");
      if (execUrl && execKey) {
        try {
          const r = await fetch(`${execUrl}/rest/v1/keys?select=game_id,is_active&key_value=eq.${encodeURIComponent(cleanKey)}&limit=1`, {
            headers: { apikey: execKey, Authorization: `Bearer ${execKey}` },
          });
          const rows = await r.json();
          const k = Array.isArray(rows) ? rows[0] : null;
          // all-access = Premium / tester keys (free keys are locked to one game; they also get bound_user_id, so
          // that column says nothing about paid vs free)
          if (k && k.game_id === "*") {
            return json({ success: false, error: "Premium keys don't need extra hours." }, 400);
          }
          if (k && k.is_active === false) {
            return json({ success: false, error: "This key was turned off. Get a new key." }, 400);
          }
        } catch { /* key DB unreachable: the key-info check above still applies */ }
      }
    }

    // Configurable +hours from admin (verify_settings.extension_hours).
    let hours = 11;
    const { data: settings } = await service
      .from("verify_settings")
      .select("extension_hours")
      .eq("id", 1)
      .maybeSingle();
    if (settings?.extension_hours && settings.extension_hours > 0) hours = settings.extension_hours;

    const token = randomToken();
    const token_hash = await sha256(token);

    const { error: insErr } = await service.from("key_extensions").insert({
      token_hash,
      hwid,
      key_value: cleanKey,
      ip,
      hours,
      status: "pending",
    });
    if (insErr) {
      console.error("[start-key-extension] insert error:", insErr);
      return json({ success: false, error: "Could not start extension. Try again." }, 500);
    }

    return json({ success: true, token, hours }, 200);
  } catch (error) {
    console.error("[start-key-extension] Error:", error);
    return json({ success: false, error: "Internal server error" }, 500);
  }
});
