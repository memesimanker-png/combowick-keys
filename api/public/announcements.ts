// Public, read-only, cached announcements API for the Roblox script loader.
// GET /api/public/announcements -> JSON array of active announcements, newest first.
// Never writes, never accepts a body, ignores query params.
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://iphiksvnuzpteoryrdxf.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwaGlrc3ZudXpwdGVvcnlyZHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjE2MzIsImV4cCI6MjA5MDgzNzYzMn0.jDERthuKYBOIu6KRFQB1WQjoCjWfKPmesZFQK8K9Clk";

const TTL_MS = 60 * 1000;

type Announcement = {
  title: string;
  message: string;
  enabled: boolean;
  createdAt: string;
};

// Per-instance in-memory cache.
let cache: { at: number; data: Announcement[] } | null = null;

// Lenient per-IP rate limit (~60/min).
const ipHits = new Map<string, { count: number; reset: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b = ipHits.get(ip);
  if (!b || b.reset < now) {
    ipHits.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  b.count += 1;
  return b.count > 60;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of ipHits) if (v.reset < now) ipHits.delete(k);
}, 120_000).unref?.();

async function loadAnnouncements(): Promise<Announcement[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("announcements")
    .select("title,message,enabled,created_at,expires_at")
    .eq("enabled", true)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    title: r.title ?? "",
    message: r.message,
    enabled: r.enabled === true,
    createdAt: r.created_at,
  }));
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=60");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  const ip =
    (req.headers["cf-connecting-ip"] as string) ||
    (req.headers["x-real-ip"] as string) ||
    ((req.headers["x-forwarded-for"] as string) || "").split(",")[0]?.trim() ||
    "unknown";

  if (rateLimited(ip)) {
    res.statusCode = 429;
    res.setHeader("Retry-After", "30");
    return res.end(JSON.stringify({ error: "Too many requests" }));
  }

  try {
    const now = Date.now();
    if (!cache || now - cache.at > TTL_MS) {
      cache = { at: now, data: await loadAnnouncements() };
    }
    res.statusCode = 200;
    return res.end(JSON.stringify(cache.data));
  } catch (e: any) {
    console.error("announcements error:", e?.message || e);
    res.statusCode = 200;
    return res.end("[]");
  }
}
