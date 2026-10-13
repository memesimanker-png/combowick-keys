// Script request board for keys.combowick.com/request.
// Actions (POST JSON {action, ...}):
//   list                      public board (+ my_votes when signed in)
//   lookup {query}            Roblox link / place id / game name -> candidate games (+ covered / already requested)
//   request {place_id}        signed in: create a request (or vote if it exists) + Discord forum post
//   vote {id}                 signed in: toggle my vote
//   set_status {id,status,note} admin: requested | in_progress | released | declined (+ Discord tag/update)
//   discord_join {provider_token} signed in with Discord: add the user to the COMBO_WICK server
// Public function (verify_jwt off); identity comes from the Authorization bearer token.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const fail = (error: string, status = 400) => json({ success: false, error }, status);

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN") ?? "";
const GUILD_ID = Deno.env.get("DISCORD_GUILD_ID") ?? "934631259861319733";
const admin = createClient(SB_URL, SERVICE, { auth: { persistSession: false } });

const FORUM = "1559638557960831126";
const TAGS = { new_game: "1559638557960831127", in_progress: "1559638557960831130", released: "1559638557960831131", declined: "1559638557960831132" };
const SITE = "https://keys.combowick.com";
const EXECUTOR = "https://v0-remix-of-roblox-executor-system.vercel.app";
const MAX_OPEN_PER_USER = 3;
const RB = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Accept: "application/json" };

async function discord(path: string, method = "GET", body?: unknown) {
  if (!BOT_TOKEN) return { status: 0, data: {} as any };
  const r = await fetch(`https://discord.com/api/v10${path}`, { method, headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  let data: any = {}; try { data = t ? JSON.parse(t) : {}; } catch { /* */ }
  return { status: r.status, data };
}

const cleanName = (n: string) => n.replace(/\[[^\]]*\]|【[^】]*】/g, "").replace(/\([^)]*\b(UPD|UPDATE|NEW|EVENT)\b[^)]*\)/gi, "")
  .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "").replace(/\(\s*\)|\[\s*\]/g, "").replace(/\s+/g, " ").trim();

let coveredCache: { at: number; set: Set<string> } | null = null;
async function coveredUniverses(): Promise<Set<string>> {
  if (coveredCache && Date.now() - coveredCache.at < 5 * 60e3) return coveredCache.set;
  try {
    const j = await (await fetch(`${EXECUTOR}/api/public/games`)).json();
    const set = new Set<string>((j?.games ?? []).map((g: any) => String(g.universe_id)).filter(Boolean));
    coveredCache = { at: Date.now(), set };
    return set;
  } catch { return coveredCache?.set ?? new Set(); }
}

async function gameInfo(universeIds: string[]) {
  if (!universeIds.length) return [];
  const [g, icons] = await Promise.all([
    fetch(`https://games.roblox.com/v1/games?universeIds=${universeIds.join(",")}`, { headers: RB }).then((r) => r.json()).catch(() => ({})),
    fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds.join(",")}&size=150x150&format=Png`, { headers: RB }).then((r) => r.json()).catch(() => ({})),
  ]);
  const iconMap = new Map((icons?.data ?? []).map((x: any) => [String(x.targetId), x.imageUrl]));
  return (g?.data ?? []).map((x: any) => ({ universe_id: String(x.id), place_id: String(x.rootPlaceId), name: cleanName(x.name) || x.name, playing: x.playing ?? 0, visits: x.visits ?? 0, icon_url: iconMap.get(String(x.id)) ?? null }));
}

async function lookup(query: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  let universes: string[] = [];
  const placeId = q.match(/roblox\.com\/(?:[a-z]{2}\/)?games\/(\d+)/i)?.[1] ?? (/^\d{5,20}$/.test(q) ? q : null);
  if (placeId) {
    const u = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`, { headers: RB }).then((r) => r.json()).catch(() => null);
    if (u?.universeId) universes = [String(u.universeId)];
  } else {
    const s = await fetch(`https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(q.slice(0, 80))}&sessionId=cw${Date.now()}&pageType=all`, { headers: RB }).then((r) => r.json()).catch(() => ({}));
    universes = [...new Set<string>((s?.searchResults ?? []).flatMap((x: any) => x.contents ?? []).filter((c: any) => c.universeId).map((c: any) => String(c.universeId)))].slice(0, 6);
  }
  const games = await gameInfo(universes);
  const covered = await coveredUniverses();
  const { data: existing } = await admin.from("script_requests").select("id, universe_id, status, vote_count").in("universe_id", games.map((g: any) => g.universe_id));
  const ex = new Map((existing ?? []).map((r) => [r.universe_id, r]));
  return games.map((g: any) => ({ ...g, covered: covered.has(g.universe_id), request: ex.get(g.universe_id) ?? null }))
    .sort((a: any, b: any) => (placeId ? 0 : b.playing - a.playing));
}

async function recount(id: number) {
  const { count } = await admin.from("script_request_votes").select("*", { count: "exact", head: true }).eq("request_id", id);
  const n = count ?? 0;
  const { data } = await admin.from("script_requests").update({ vote_count: n, updated_at: new Date().toISOString() }).eq("id", id).select("vote_count, discord_thread_id, game_name").single();
  return { n, row: data };
}

const MILESTONES = [10, 25, 50, 100, 250, 500];
const discordIdOf = (u: any): string | null => {
  const ident = (u?.identities ?? []).find((i: any) => i.provider === "discord");
  return ident?.identity_data?.provider_id ?? ident?.identity_data?.sub ?? ident?.id ?? (u?.app_metadata?.provider === "discord" ? u?.user_metadata?.provider_id ?? null : null);
};
const REWARD_TEXT = "🎥 **Get a free week:** record **3-5 minutes** using the script with **Streamer Mode ON**, then tap **Submit video**. Once staff approve it, you get a **1-week key** for this game.";
const CRON_SECRET = Deno.env.get("DISCORD_CRON_SECRET") ?? "";

// DM everyone who voted (Discord sign-ins only) that their game is out.
async function notifyVoters(row: any) {
  const { data: votes } = await admin.from("script_request_votes").select("user_id, discord_id").eq("request_id", row.id).limit(500);
  let sent = 0;
  for (const v of votes ?? []) {
    let discordId: string | null = v.discord_id;
    if (!discordId) { const { data } = await admin.auth.admin.getUserById(v.user_id); discordId = discordIdOf(data?.user); }
    if (!discordId) continue;
    const dm = await discord("/users/@me/channels", "POST", { recipient_id: discordId });
    if (dm.status !== 200) continue;
    const r = await discord(`/channels/${dm.data.id}/messages`, "POST", {
      flags: 1 << 15,
      components: [{ type: 17, accent_color: 0x2ecc71, components: [
        { type: 9, components: [{ type: 10, content: `### ✅ ${row.game_name} is out!\nThe script you voted for is ready. Grab a key and run it.` }],
          accessory: { type: 11, media: { url: row.icon_url ?? "https://cdn.discordapp.com/icons/934631259861319733/a_3c6b0ba4deedbc36b995e33a02d0948c.png?size=256" } } },
        { type: 14, divider: true, spacing: 1 },
        { type: 10, content: REWARD_TEXT },
        { type: 1, components: [
        { type: 2, style: 3, label: "Submit video", custom_id: `cw:v:open:${row.id}`, emoji: { name: "🎥" } },
        { type: 2, style: 5, label: "Get key", url: `${SITE}/keys`, emoji: { name: "🔑" } },
        { type: 2, style: 5, label: "Play game", url: `https://www.roblox.com/games/${row.place_id}`, emoji: { name: "🎮" } },
        ] },
        { type: 10, content: "-# COMBO_WICK script requests" },
      ] }],
    });
    if (r.status === 200) sent++;
  }
  return sent;
}

async function applyStatus(id: number, status: string, note: string | null) {
  const { data: row, error } = await admin.from("script_requests").update({ status, admin_note: note, updated_at: new Date().toISOString(), released_at: status === "released" ? new Date().toISOString() : null }).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  if (row.discord_thread_id) {
    const tag = status === "requested" ? TAGS.new_game : (TAGS as any)[status];
    await discord(`/channels/${row.discord_thread_id}`, "PATCH", { applied_tags: [tag], archived: false });
    const msg = status === "in_progress" ? `🛠️ **We're working on ${row.game_name}!**`
      : status === "released" ? `✅ **${row.game_name} is out!** Get a key at ${SITE}/keys and run the script.`
      : status === "declined" ? `⛔ **${row.game_name} won't be made.**${note ? " " + note : ""}` : null;
    if (status === "released") await discord(`/channels/${row.discord_thread_id}/messages`, "POST", { allowed_mentions: { parse: [] }, flags: 1 << 15, components: [{ type: 17, accent_color: 0x2ecc71, components: [
      { type: 10, content: `### ✅ ${row.game_name} is out!\nGet a key at ${SITE}/keys and run the script.` },
      { type: 14, divider: true, spacing: 1 },
      { type: 10, content: REWARD_TEXT + "\n-# Only people who requested or voted for this game can claim it." },
      { type: 1, components: [{ type: 2, style: 3, label: "Submit video", custom_id: `cw:v:open:${row.id}`, emoji: { name: "🎥" } }, { type: 2, style: 5, label: "Get key", url: `${SITE}/keys`, emoji: { name: "🔑" } }] },
    ] }] });
    else if (msg) await discord(`/channels/${row.discord_thread_id}/messages`, "POST", { content: msg, allowed_mentions: { parse: [] } });
  }
  const notified = status === "released" ? await notifyVoters(row) : 0;
  return { row, notified };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const b = await req.json().catch(() => ({}));
    const action = String(b.action ?? "");

    // who's calling?
    let user: any = null;
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (token && token.split(".").length === 3) {
      const { data } = await admin.auth.getUser(token);
      user = data?.user ?? null;
    }

    if (action === "list") {
      const { data, error } = await admin.from("script_requests")
        .select("id, universe_id, place_id, game_name, icon_url, players_at_request, status, admin_note, vote_count, discord_thread_id, created_at, released_at")
        .order("vote_count", { ascending: false }).order("created_at", { ascending: false }).limit(300);
      if (error) return fail(error.message, 500);
      let my_votes: number[] = [];
      if (user) {
        const { data: v } = await admin.from("script_request_votes").select("request_id").eq("user_id", user.id);
        my_votes = (v ?? []).map((x) => x.request_id);
      }
      return json({ success: true, requests: data, my_votes });
    }

    if (action === "lookup") return json({ success: true, games: await lookup(String(b.query ?? "")) });

    if (action === "auto_release") {
      if (!CRON_SECRET || req.headers.get("x-cw-cron") !== CRON_SECRET) return fail("forbidden", 403);
      const { data: r } = await admin.from("script_requests").select("id, game_name").eq("universe_id", String(b.universe_id ?? "")).in("status", ["requested", "in_progress"]).maybeSingle();
      if (!r) return json({ success: true, released: false });
      const { notified } = await applyStatus(r.id, "released", null);
      return json({ success: true, released: true, game: r.game_name, notified });
    }

    if (!user) return fail("Please sign in first.", 401);
    const hasDiscord = (user.identities ?? []).some((i: any) => i.provider === "discord") || user.app_metadata?.provider === "discord";
    if (!hasDiscord && (action === "request" || action === "vote")) return fail("Please sign in with Discord to request and vote.", 401);

    if (action === "discord_join") {
      const discordId = user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? user.identities?.find((i: any) => i.provider === "discord")?.id;
      const accessToken = String(b.provider_token ?? "");
      if (!discordId || !accessToken) return fail("Not a Discord sign-in.");
      const r = await discord(`/guilds/${GUILD_ID}/members/${discordId}`, "PUT", { access_token: accessToken });
      return json({ success: r.status === 201 || r.status === 204, joined: r.status === 201, already: r.status === 204, status: r.status });
    }

    if (action === "request") {
      const placeId = String(b.place_id ?? "").trim();
      if (!/^\d{3,20}$/.test(placeId)) return fail("Pick a game from the search results.");
      const [g] = await lookup(placeId);
      if (!g) return fail("That Roblox game doesn't exist.");
      if (g.covered) return json({ success: false, covered: true, error: `${g.name} is already supported. Get a key and use the script!` });
      if (g.request) {
        await admin.from("script_request_votes").upsert({ request_id: g.request.id, user_id: user.id, discord_id: discordIdOf(user) }, { onConflict: "request_id,user_id", ignoreDuplicates: true });
        const { n } = await recount(g.request.id);
        return json({ success: true, existed: true, id: g.request.id, vote_count: n });
      }
      const { count } = await admin.from("script_requests").select("*", { count: "exact", head: true }).eq("created_by", user.id).in("status", ["requested", "in_progress"]);
      if ((count ?? 0) >= MAX_OPEN_PER_USER) return fail(`You already have ${MAX_OPEN_PER_USER} open requests. Vote for others while you wait!`, 429);
      const { data: row, error } = await admin.from("script_requests").insert({
        universe_id: g.universe_id, place_id: g.place_id, game_name: g.name, icon_url: g.icon_url, players_at_request: g.playing, created_by: user.id, vote_count: 1,
      }).select().single();
      if (error) return fail(error.code === "23505" ? "Someone just requested this game. Refresh and vote!" : error.message, 409);
      await admin.from("script_request_votes").insert({ request_id: row.id, user_id: user.id, discord_id: discordIdOf(user) });
      // mirror it in the Discord forum
      const t = await discord(`/channels/${FORUM}/threads`, "POST", {
        name: g.name.slice(0, 95), applied_tags: [TAGS.new_game],
        message: {
          allowed_mentions: { parse: [] },
          flags: 1 << 15,
          components: [{ type: 17, accent_color: 0xf5b700, components: [
            { type: 9, components: [{ type: 10, content: `### 🎮 ${g.name}\nRequested on the website · 👥 **${g.playing.toLocaleString("en-US")}** playing now` }],
              accessory: { type: 11, media: { url: g.icon_url ?? "https://cdn.discordapp.com/icons/934631259861319733/a_3c6b0ba4deedbc36b995e33a02d0948c.png?size=256" } } },
            { type: 14, divider: true, spacing: 1 },
            { type: 10, content: "React 👍 here or vote on the website. The most-voted games get made first." },
            { type: 1, components: [{ type: 2, style: 5, label: "Vote on the website", url: `${SITE}/request`, emoji: { name: "👍" } }, { type: 2, style: 5, label: "Play game", url: `https://www.roblox.com/games/${g.place_id}`, emoji: { name: "🎮" } }] },
          ] }],
        },
      });
      if (t.status === 201 || t.status === 200) await admin.from("script_requests").update({ discord_thread_id: t.data.id }).eq("id", row.id);
      return json({ success: true, created: true, id: row.id, vote_count: 1 });
    }

    if (action === "vote") {
      const id = Number(b.id);
      const { data: r } = await admin.from("script_requests").select("id, status").eq("id", id).maybeSingle();
      if (!r) return fail("Request not found.", 404);
      if (r.status === "released" || r.status === "declined") return fail("Voting is closed for this game.");
      const { data: mine } = await admin.from("script_request_votes").select("request_id").eq("request_id", id).eq("user_id", user.id).maybeSingle();
      if (mine) await admin.from("script_request_votes").delete().eq("request_id", id).eq("user_id", user.id);
      else await admin.from("script_request_votes").insert({ request_id: id, user_id: user.id, discord_id: discordIdOf(user) });
      const { n, row } = await recount(id);
      if (!mine && MILESTONES.includes(n) && row?.discord_thread_id) {
        await discord(`/channels/${row.discord_thread_id}/messages`, "POST", { content: `🔥 **${row.game_name}** just hit **${n} votes** on the website!`, allowed_mentions: { parse: [] } });
      }
      return json({ success: true, voted: !mine, vote_count: n });
    }

    if (action === "set_status") {
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) return fail("Admins only.", 403);
      const id = Number(b.id), status = String(b.status), note = b.note ? String(b.note).slice(0, 300) : null;
      if (!["requested", "in_progress", "released", "declined"].includes(status)) return fail("Bad status.");
      const { row, notified } = await applyStatus(id, status, note);
      return json({ success: true, request: row, notified });
    }

    return fail("Unknown action.");
  } catch (e) {
    return fail(String((e as Error)?.message ?? e), 500);
  }
});
