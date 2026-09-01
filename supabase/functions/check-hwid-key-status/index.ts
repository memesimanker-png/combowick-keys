const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHECK_HWID_API_ENDPOINT =
  "https://v0-remix-of-roblox-executor-system.vercel.app/api/check-hwid-key-status";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const requestBody = {
      hwid: body.hwid || "unknown",
    };

    console.log("[check-hwid-key-status] Checking:", requestBody);

    const response = await fetch(CHECK_HWID_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        Origin: "https://v0-secure-admin-dashboard-kappa.vercel.app",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("[check-hwid-key-status] Response status:", response.status);

    const rawText = await response.text();
    let responseData: Record<string, unknown>;

    try {
      responseData = JSON.parse(rawText);
    } catch {
      responseData = { message: rawText || `External API returned status ${response.status}` };
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: (responseData as any).message || "Failed to check HWID key status",
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[check-hwid-key-status] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
