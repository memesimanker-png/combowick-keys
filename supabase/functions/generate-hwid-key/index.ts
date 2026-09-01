import { getExternalSupabase } from "../_shared/external-supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HWID_KEY_API_ENDPOINT =
  "https://v0-remix-of-roblox-executor-system.vercel.app/api/generate-hwid-key";

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

function getIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const origin = req.headers.get("origin");
    if (!isAllowedOrigin(origin)) {
      console.warn("[generate-hwid-key] blocked origin:", origin);
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { username, verify_token } = body as { username?: string; verify_token?: string };

    if (!verify_token || typeof verify_token !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Verification required. Please complete the verification steps." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ip = getIp(req);
    // Offloaded to EXTERNAL Supabase.
    const supabase = getExternalSupabase();

    // Validate verify token
    const tokenHash = await sha256(verify_token);
    const { data: tokenRow, error: tokErr } = await supabase
      .from("verify_tokens")
      .select("id, ip, used, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokErr || !tokenRow) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid verification token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (tokenRow.used) {
      return new Response(
        JSON.stringify({ success: false, error: "Verification token already used. Please verify again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({ success: false, error: "Verification token expired. Please verify again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (tokenRow.ip !== ip) {
      console.warn("[generate-hwid-key] IP mismatch:", tokenRow.ip, "vs", ip);
      return new Response(
        JSON.stringify({ success: false, error: "Verification token does not match this device." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Per-IP rate limit: 1 key per 10 hours
    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
    const { count, error: cntErr } = await supabase
      .from("hwid_key_ip_log")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", tenHoursAgo);

    if (cntErr) {
      console.error("[generate-hwid-key] rate-limit count error:", cntErr);
    } else if ((count ?? 0) >= 1) {
      return new Response(
        JSON.stringify({ success: false, error: "Rate limit: only 1 key per 10 hours per IP." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Burn the token early (single-use)
    await supabase
      .from("verify_tokens")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    const requestBody: { username?: string; hours: number } = { hours: 11 };
    if (username && typeof username === "string" && username.trim().length > 0) {
      requestBody.username = username.trim();
    }

    const response = await fetch(HWID_KEY_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();
    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.message || responseData.error || "Failed to generate key",
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log IP success for rate limit
    await supabase.from("hwid_key_ip_log").insert({ ip });

    return new Response(
      JSON.stringify({
        success: true,
        key: responseData.key,
        expiresAt: responseData.expiresAt,
        hours: 11,
        username: responseData.username,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-hwid-key] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
