// Resolve a Roblox account for the "Fix device" flow: username -> userId (or confirm a
// userId) and fetch the avatar headshot + display name. Roblox APIs send NO CORS headers,
// so the browser can't call them directly — this proxies server-side. Public (verify_jwt off).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const RB = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
};

async function avatarUrl(id: number): Promise<string> {
  try {
    const r = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=150x150&format=Png&isCircular=false`, { headers: RB });
    const j = await r.json();
    return j?.data?.[0]?.imageUrl || "";
  } catch { return ""; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const b = await req.json().catch(() => ({}));
    const username = (b.username ? String(b.username).trim() : "");
    const userId = (b.user_id ? String(b.user_id).trim() : "");

    // Confirm-by-id mode: show the avatar/name for a typed UserId.
    if (userId) {
      if (!/^\d{2,20}$/.test(userId)) return json({ success: false, error: "UserId must be numbers only." }, 400);
      const r = await fetch(`https://users.roblox.com/v1/users/${userId}`, { headers: RB });
      if (r.status === 404) return json({ success: false, error: "No Roblox account with that UserId." }, 404);
      if (!r.ok) return json({ success: false, error: "Roblox lookup failed. Try again." }, 502);
      const u = await r.json();
      return json({ success: true, user: { id: Number(userId), name: u.name, displayName: u.displayName, hasVerifiedBadge: !!u.hasVerifiedBadge, avatarUrl: await avatarUrl(Number(userId)) } });
    }

    // Search-by-username mode.
    if (username) {
      if (username.length < 3 || username.length > 20 || !/^[A-Za-z0-9_]+$/.test(username)) {
        return json({ success: false, error: "Enter a valid Roblox username (letters, numbers, _)." }, 400);
      }
      const r = await fetch("https://users.roblox.com/v1/usernames/users", {
        method: "POST", headers: RB,
        body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
      });
      if (!r.ok) return json({ success: false, error: "Roblox lookup failed. Try again." }, 502);
      const j = await r.json();
      const hit = j?.data?.[0];
      if (!hit) return json({ success: false, error: `No Roblox user named "${username}".` }, 404);
      return json({ success: true, user: { id: hit.id, name: hit.name, displayName: hit.displayName, hasVerifiedBadge: !!hit.hasVerifiedBadge, avatarUrl: await avatarUrl(hit.id) } });
    }

    return json({ success: false, error: "Provide a username or a user_id." }, 400);
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : "Something went wrong." }, 500);
  }
});
