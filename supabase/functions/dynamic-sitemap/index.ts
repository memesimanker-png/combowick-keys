import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { redisGet, redisSet } from "../_shared/redis.ts";

const SITEMAP_CACHE_KEY = "sitemap:xml:v1";
const SITEMAP_TTL = 900; // 15 min
let memCache: { at: number; xml: string } | null = null;

const BASE_URL = "https://combowick-keys.vercel.app";

const STATIC_PAGES = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/premium-keys", changefreq: "weekly", priority: "0.9" },
  { loc: "/keys", changefreq: "weekly", priority: "0.9" },
  { loc: "/privacy", changefreq: "monthly", priority: "0.5" },
  { loc: "/terms", changefreq: "monthly", priority: "0.5" },
  { loc: "/refund-policy", changefreq: "monthly", priority: "0.5" },
];

const BLOG_SLUGS = [
  "roblox-account-security-guide",
  "how-to-earn-robux-free",
  "roblox-trading-tips",
  "best-roblox-games-2026",
  "roblox-studio-beginners",
  "premium-membership-analysis",
  "roblox-lua-scripting-tips",
  "roblox-avatar-customization-guide",
  "roblox-group-management",
  "roblox-game-monetization",
  "roblox-parental-controls-safety",
  "roblox-device-compatibility-performance",
  "roblox-economy-robux-explained",
  "roblox-reporting-moderation-guide",
  "roblox-events-seasonal-guide",
  "roblox-performance-optimization",
  "roblox-building-techniques",
  "roblox-social-features-guide",
  "roblox-inventory-management",
  "roblox-animation-guide",
];

const LANGS = ["en", "es", "fr", "de", "pt", "ru", "zh", "ja", "ko", "ar"];

function hreflangTags(loc: string): string {
  const fullUrl = `${BASE_URL}${loc}`;
  const tags = LANGS.map(
    (l) =>
      `    <xhtml:link rel="alternate" hreflang="${l}" href="${fullUrl}${fullUrl.includes("?") ? "&" : "?"}lang=${l}"/>`
  );
  tags.push(
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${fullUrl}"/>`
  );
  return tags.join("\n");
}

function urlEntry(
  loc: string,
  lastmod: string,
  changefreq: string,
  priority: string
): string {
  return `  <url>
    <loc>${BASE_URL}${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${hreflangTags(loc)}
  </url>`;
}

const xmlHeaders = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
  "CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "Access-Control-Allow-Origin": "*",
};

Deno.serve(async () => {
  const today = new Date().toISOString().split("T")[0];

  if (memCache && Date.now() - memCache.at < SITEMAP_TTL * 1000) {
    return new Response(memCache.xml, { headers: xmlHeaders });
  }
  const cached = await redisGet(SITEMAP_CACHE_KEY);
  if (cached) {
    memCache = { at: Date.now(), xml: cached };
    return new Response(cached, { headers: xmlHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  // Fetch all scripts
  const { data: scripts } = await supabase
    .from("scripts")
    .select("slug, updated_at")
    .order("updated_at", { ascending: false });

  const entries: string[] = [];

  // Static pages
  for (const page of STATIC_PAGES) {
    entries.push(urlEntry(page.loc, today, page.changefreq, page.priority));
  }

  // Blog posts
  for (const slug of BLOG_SLUGS) {
    entries.push(urlEntry(`/blog/${slug}`, today, "monthly", "0.7"));
  }

  // Dynamic script pages
  if (scripts) {
    for (const script of scripts) {
      const lastmod = script.updated_at
        ? script.updated_at.split("T")[0]
        : today;
      entries.push(urlEntry(`/scripts/${script.slug}`, lastmod, "weekly", "0.8"));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>`;

  memCache = { at: Date.now(), xml };
  await redisSet(SITEMAP_CACHE_KEY, xml, SITEMAP_TTL);

  return new Response(xml, { headers: xmlHeaders });
});
