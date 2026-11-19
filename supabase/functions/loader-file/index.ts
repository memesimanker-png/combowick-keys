// Creates a per-game loader file in checkurasshole/Loaders for the Admin "new script" form (2026-11-19).
// Replaces the browser calling the open "Lua Manager" GitHub proxy (vcuwjyjkbtxccywzeadu), which let anyone write
// any file with its server token. Here: logged-in staff with the Scripts tab only, one fixed repo, a file name made of
// letters/digits, and fixed content (the IQ loadstring). An existing file is never overwritten.
// Secret: LOADER_GH_TOKEN (a GitHub token with push to checkurasshole/Loaders). Deploy with verify_jwt true.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const REPO = "checkurasshole/Loaders";
const CONTENT = `loadstring(game:HttpGet('https://raw.githubusercontent.com/checkurasshole/Script/refs/heads/main/IQ'))();`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Login required" }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ok } = await admin.rpc("has_tab", { _user_id: u.user.id, _tab: "scripts" });
    if (!ok) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const fileName = String(body?.fileName || "");
    if (!/^[A-Za-z0-9]{1,80}$/.test(fileName)) return json({ error: "Bad file name" }, 400);
    const game = String(body?.game || fileName).replace(/[^\w \-.'&]/g, "").slice(0, 80);

    const tok = Deno.env.get("LOADER_GH_TOKEN");
    if (!tok) return json({ error: "Loader token not configured" }, 500);
    const H = { Authorization: `token ${tok}`, "User-Agent": "combowick-store", Accept: "application/vnd.github+json" };
    const api = `https://api.github.com/repos/${REPO}/contents/${fileName}`;

    const existing = await fetch(api, { headers: H });
    if (existing.ok) return json({ ok: true, fileName, existed: true });
    if (existing.status !== 404) return json({ error: `GitHub ${existing.status}` }, 502);

    const put = await fetch(api, {
      method: "PUT",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify({ message: `Add loader for ${game}`, content: btoa(CONTENT) }),
    });
    if (!put.ok) return json({ error: `GitHub ${put.status}` }, 502);
    return json({ ok: true, fileName, existed: false });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
