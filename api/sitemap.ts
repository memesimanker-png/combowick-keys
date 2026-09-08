// Dynamic sitemap — auto-includes every script page so Google discovers your
// "[game] script" money pages. Static file only listed 6 URLs and no scripts.
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://sqahviibykrzlwnulgmw.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYWh2aWlieWtyemx3bnVsZ213Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODAxNjQsImV4cCI6MjEwMzg1NjE2NH0.mvRGR-d3EOcy8bBlCTDwIHEF4ELIU9PfVXDi8NSALlA";
// One place to change the canonical host — set SITE_URL env when you move to a custom domain.
const BASE = (process.env.SITE_URL || "https://combowick-keys.vercel.app").replace(/\/$/, "");

const STATIC: { path: string; priority: string; freq: string }[] = [
  { path: "/", priority: "1.0", freq: "daily" },
  { path: "/scripts", priority: "0.9", freq: "daily" },
  { path: "/premium-keys", priority: "0.8", freq: "weekly" },
  { path: "/keys", priority: "0.7", freq: "weekly" },
  { path: "/privacy", priority: "0.3", freq: "yearly" },
  { path: "/terms", priority: "0.3", freq: "yearly" },
  { path: "/refund-policy", priority: "0.3", freq: "yearly" },
];

const esc = (s: any) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export default async function handler(_req: any, res: any) {
  let scripts: { slug: string; updated_at?: string }[] = [];
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data } = await supabase
      .from("scripts")
      .select("slug, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5000);
    scripts = (data || []).filter((s: any) => s.slug);
  } catch { /* fall back to static-only */ }

  const today = new Date().toISOString().slice(0, 10);
  const urls: string[] = [];

  for (const p of STATIC) {
    urls.push(
      `<url><loc>${BASE}${p.path}</loc><lastmod>${today}</lastmod><changefreq>${p.freq}</changefreq><priority>${p.priority}</priority></url>`
    );
  }
  for (const s of scripts) {
    const lastmod = (s.updated_at || today).slice(0, 10);
    urls.push(
      `<url><loc>${BASE}/scripts/${esc(s.slug)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400");
  return res.end(xml);
}
