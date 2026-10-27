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
  const fwd = req.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const KEY_LIMIT = 5;                       // free keys per IP per window
const KEY_WINDOW_MS = 10 * 60 * 60 * 1000; // 10 hours

// How many keys this IP made in the window, and when the oldest one drops out (= next free slot).
async function quotaFor(supabase: any, ip: string): Promise<{ used: number; resets_at: string | null }> {
  const since = new Date(Date.now() - KEY_WINDOW_MS).toISOString();
  const { data, count } = await supabase
    .from("hwid_key_ip_log")
    .select("created_at", { count: "exact" })
    .eq("ip", ip)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(1);
  const oldest = data?.[0]?.created_at;
  return { used: count ?? 0, resets_at: oldest ? new Date(new Date(oldest).getTime() + KEY_WINDOW_MS).toISOString() : null };
}

// Every refusal is recorded so "earned a token but never got a key" can be explained later.
function logFail(supabase: any, reason: string, ip: string, tokenIp: string | null = null, detail = "") {
  supabase.from("key_gen_fail_log").insert({ reason, ip, token_ip: tokenIp, detail: detail.slice(0, 300) }).then(() => {}, () => {});
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

    // Quota check only (no token needed): the key page asks this BEFORE the visitor does an offer, so
    // nobody completes an offer just to be told "limit reached" at the very end.
    if ((body as any)?.check_quota) {
      const q = await quotaFor(getExternalSupabase(), getIp(req));
      return new Response(
        JSON.stringify({ success: true, limit: KEY_LIMIT, used: q.used, limited: q.used >= KEY_LIMIT, resets_at: q.resets_at }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      .select("id, ip, used, expires_at, hours")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokErr || !tokenRow) {
      logFail(supabase, "invalid_token", ip);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid verification token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (tokenRow.used) {
      logFail(supabase, "token_used", ip, tokenRow.ip);
      return new Response(
        JSON.stringify({ success: false, error: "Verification token already used. Please verify again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      logFail(supabase, "token_expired", ip, tokenRow.ip);
      return new Response(
        JSON.stringify({ success: false, error: "Verification token expired. Please verify again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // The token is a long random single-use secret that expires in minutes, so it is NOT tied to the
    // IP any more: phones switching Wi-Fi <-> mobile data got "does not match this device" and lost the
    // key they had just earned. Still recorded so we can see how often it happens.
    if (tokenRow.ip !== ip) {
      console.warn("[generate-hwid-key] IP changed since verification:", tokenRow.ip, "->", ip);
      logFail(supabase, "ip_changed_allowed", ip, tokenRow.ip);
    }

    // Per-IP rate limit: KEY_LIMIT keys per 10 hours (the token is NOT burned when refused)
    const quota = await quotaFor(supabase, ip).catch(() => null);
    if (quota && quota.used >= KEY_LIMIT) {
      logFail(supabase, "rate_limited", ip, tokenRow.ip);
      return new Response(
        JSON.stringify({ success: false, code: "rate_limited", resets_at: quota.resets_at, error: "Rate limit: only 5 keys per 10 hours per IP." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Burn the token early (single-use)
    await supabase
      .from("verify_tokens")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    // Hours were decided when the verify token was issued (offer 24 / CPC 8 / Linkvertise 6, admin-set).
    const keyHours = Number((tokenRow as any).hours) > 0 ? Number((tokenRow as any).hours) : 6;
    const requestBody: { username?: string; hours: number; game_id?: string } = { hours: keyHours };
    // Lock the key to the game picked on the key page (the executor API maps a place id to its universe).
    // This was never forwarded before, so keys bound to whatever game they were FIRST used in.
    const pickedGame = String((body as any)?.game_id ?? "").trim();
    if (/^[0-9]{1,20}$/.test(pickedGame)) requestBody.game_id = pickedGame;
    if (username && typeof username === "string" && username.trim().length > 0) {
      requestBody.username = username.trim();
    }

    // If creating the key fails, give the token back — otherwise the visitor loses the key they earned
    // ("token already used" on retry).
    const unburn = () => supabase.from("verify_tokens").update({ used: false, used_at: null }).eq("id", tokenRow.id);
    let response: Response;
    try {
      response = await fetch(HWID_KEY_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "x-cw-key-secret": Deno.env.get("KEY_API_SECRET") ?? "",   // key server auth
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });
    } catch (e) {
      await unburn();
      logFail(supabase, "key_api_unreachable", ip, tokenRow.ip, String(e));
      return new Response(
        JSON.stringify({ success: false, error: "Key server is busy — please press Generate again." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      await unburn();
      logFail(supabase, "key_api_error", ip, tokenRow.ip, `${response.status} ${responseData?.message || responseData?.error || ""}`);
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
        hours: keyHours,
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
