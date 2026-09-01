import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { keyInfo, extendKey } from "../_shared/shop-key-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ORIGINS = [
  "https://shop-ready.lovable.app",
  "https://combowick.com",
  "https://www.combowick.com",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    return /\.lovable\.app$/.test(new URL(origin).hostname);
  } catch {
    return false;
  }
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

function remainingHours(expiresAt?: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const origin = req.headers.get("origin");
    if (!isAllowedOrigin(origin)) {
      console.warn("[complete-key-extension] blocked origin:", origin);
      return json({ success: false, error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const { token, hwid } = body as { token?: string; hwid?: string };

    if (!token || typeof token !== "string") {
      return json({ success: false, error: "Missing completion token." }, 400);
    }
    if (!hwid || typeof hwid !== "string") {
      return json({ success: false, error: "Missing device identifier." }, 400);
    }

    const token_hash = await sha256(token);
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up the pending record for this token.
    const { data: row, error: selErr } = await service
      .from("key_extensions")
      .select("*")
      .eq("token_hash", token_hash)
      .maybeSingle();

    if (selErr || !row) {
      return json({ success: false, error: "Invalid or unknown completion token." }, 401);
    }

    // TASK 4 (replay): a completed/processing token can never add hours again.
    if (row.status !== "pending") {
      return json({ success: false, error: "This completion was already used." }, 409);
    }
    // TASK 3 (correct key / ownership): the returning device must match.
    if (row.hwid !== hwid) {
      return json({ success: false, error: "Device mismatch — cannot extend this key." }, 403);
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json({ success: false, error: "This extension session expired. Please start again." }, 410);
    }

    // Atomically claim the row (pending -> processing). If another request already
    // claimed it, `claimed` will be empty and we abort — prevents double extension.
    const { data: claimed, error: claimErr } = await service
      .from("key_extensions")
      .update({ status: "processing" })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (claimErr || !claimed) {
      return json({ success: false, error: "This completion was already used." }, 409);
    }

    // Snapshot BEFORE remaining time.
    const beforeInfo = await keyInfo(row.key_value);
    const beforeExpires = beforeInfo.data?.expires_at ?? null;

    // Apply the +hours on the external key server.
    const ext = await extendKey(row.key_value, row.hours);
    if (!ext.ok) {
      // Roll back the claim so the user can retry the same completion.
      await service.from("key_extensions").update({ status: "pending" }).eq("id", row.id);
      return json({ success: false, error: ext.data?.error || "Failed to extend key on server." }, 502);
    }

    // Snapshot AFTER remaining time.
    let afterExpires = ext.data?.new_expires_at ?? null;
    if (!afterExpires) {
      const afterInfo = await keyInfo(row.key_value);
      afterExpires = afterInfo.data?.expires_at ?? null;
    }

    await service
      .from("key_extensions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        before_expires_at: beforeExpires,
        after_expires_at: afterExpires,
      })
      .eq("id", row.id);

    // Keep local purchase record (if any) in sync.
    if (afterExpires) {
      await service
        .from("premium_key_purchases")
        .update({ expires_at: afterExpires })
        .eq("key_generated", row.key_value);
    }

    return json({
      success: true,
      hours: row.hours,
      key: row.key_value,
      before_expires_at: beforeExpires,
      after_expires_at: afterExpires,
      before_hours_left: remainingHours(beforeExpires),
      after_hours_left: remainingHours(afterExpires),
    }, 200);
  } catch (error) {
    console.error("[complete-key-extension] Error:", error);
    return json({ success: false, error: "Internal server error" }, 500);
  }
});
