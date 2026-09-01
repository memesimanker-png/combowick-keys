// Public announcements API — DISABLED.
// Endpoint kept alive so existing loaders get a clean, cacheable response
// instead of an error, but it no longer reads the database.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ error: "disabled", message: "Announcements API is disabled." }),
    {
      status: 410,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=900, s-maxage=900",
      },
    },
  );
});
