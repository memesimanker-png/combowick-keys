// Vercel serverless prerender for /scripts/:slug.
// Returns full HTML with meta tags + visible body content so search engines
// and social crawlers index game-keyword pages without executing JS.
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://iphiksvnuzpteoryrdxf.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwaGlrc3ZudXpwdGVvcnlyZHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjE2MzIsImV4cCI6MjA5MDgzNzYzMn0.jDERthuKYBOIu6KRFQB1WQjoCjWfKPmesZFQK8K9Clk";
const BASE_URL = "https://combowick.com";

const esc = (s: any) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function readBundledIndex(): string {
  // Vercel bundles the build output; read the shipped index.html so we keep
  // the same <script>/<link> bundle URLs the SPA expects after hydration.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require("fs");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require("path");
    const candidates = [
      path.join(process.cwd(), "dist", "index.html"),
      path.join(process.cwd(), "public", "index.html"),
      path.join(process.cwd(), "index.html"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
    }
  } catch { }
  return `<!doctype html><html><head></head><body><div id="root"></div></body></html>`;
}

export default async function handler(req: any, res: any) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || "combowick.com"}`);
    const slug = (
      (req.query && (req.query.slug as string)) ||
      url.searchParams.get("slug") ||
      url.pathname.split("/").filter(Boolean).pop() ||
      ""
    ).toLowerCase();
    if (!slug) {
      res.statusCode = 302;
      res.setHeader("Location", "/scripts");
      return res.end();
    }


    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: script } = await supabase
      .from("scripts")
      .select(
        "slug,title,description,long_description,game,game_universe_id,updated_at,created_at,thumbnail_url,category"
      )
      .eq("slug", slug)
      .maybeSingle();

    let template = readBundledIndex();
    const canonical = `${BASE_URL}/scripts/${slug}`;

    if (!script) {
      // Serve the SPA shell with a 404 status so Google drops missing slugs.
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.end(template);
    }

    const game = script.game || "Roblox";
    const year = new Date().getFullYear();
    const title = `${game} Script — ${script.title} | Free Roblox | ComboWick`.slice(0, 70);
    const description =
      `Free ${game} script for Roblox. ${script.description} Auto farm, ESP & more — copy & execute with any Roblox executor. Safe, verified, working ${year}.`.slice(
        0,
        160
      );
    const longText = String(script.long_description || script.description || "")
      .slice(0, 2000);

    const jsonLd = [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareSourceCode",
        name: `${game} Script — ${script.title}`,
        description: longText || script.description,
        programmingLanguage: "Lua",
        runtimePlatform: "Roblox",
        codeRepository: canonical,
        author: { "@type": "Organization", name: "ComboWick" },
        about: {
          "@type": "VideoGame",
          name: game,
          gamePlatform: "Roblox",
          ...(script.game_universe_id
            ? { url: `https://www.roblox.com/games/${script.game_universe_id}` }
            : {}),
        },
        keywords: [
          game,
          `${game} script`,
          `${game} roblox script`,
          `${game} hack`,
          `${game} auto farm`,
          `${game} esp`,
          script.title,
        ].join(", "),
        dateCreated: script.created_at,
        dateModified: script.updated_at,
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Scripts", item: `${BASE_URL}/scripts` },
          { "@type": "ListItem", position: 3, name: `${game} Scripts`, item: `${BASE_URL}/scripts?game=${encodeURIComponent(game)}` },
          { "@type": "ListItem", position: 4, name: script.title, item: canonical },
        ],
      },
    ];

    const headTags = `
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <meta name="keywords" content="${esc(`${game}, ${game} script, ${game} roblox script, ${game} hack, ${game} auto farm, ${game} esp, roblox ${game} script, ${script.title}`)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:type" content="article" />
    ${script.thumbnail_url ? `<meta property="og:image" content="${esc(script.thumbnail_url)}" />` : ""}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>
`;

    // Inject head tags before </head>
    template = template.replace(/<\/head>/i, `${headTags}</head>`);

    // Inject SEO body fallback INSIDE #root so crawlers without JS still
    // get the keyword-rich content. React's hydration replaces it on mount.
    const seoBody = `
<noscript>
<article>
  <nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/scripts">Scripts</a> &rsaquo; <a href="/scripts?game=${esc(encodeURIComponent(game))}">${esc(game)} Scripts</a> &rsaquo; <span>${esc(script.title)}</span></nav>
</article>
</noscript>
<div id="seo-prerender" style="position:absolute;left:-99999px;top:auto;width:1px;height:1px;overflow:hidden;">
  <h1>${esc(game)} Script — ${esc(script.title)} (Free Roblox ${year})</h1>
  <p><strong>${esc(description)}</strong></p>
  <h2>About ${esc(game)} script</h2>
  <p>${esc(longText)}</p>
  <h2>Features</h2>
  <ul>
    <li>Free ${esc(game)} script for Roblox</li>
    <li>Auto farm, ESP, infinite stats</li>
    <li>Works with all major Roblox executors</li>
    <li>Updated ${esc(year)} — verified safe</li>
  </ul>
  <h2>How to use the ${esc(game)} script</h2>
  <ol>
    <li>Open Roblox and join ${esc(game)}.</li>
    <li>Launch your executor and inject.</li>
    <li>Paste the ComboWick ${esc(game)} script and execute.</li>
  </ol>
  <p>Related: <a href="/scripts?game=${esc(encodeURIComponent(game))}">More ${esc(game)} scripts</a> · <a href="/scripts">All Roblox scripts</a> · <a href="/executors">Best Roblox executors</a></p>
</div>`;

    template = template.replace(
      /<div id="root"><\/div>/i,
      `<div id="root">${seoBody}</div>`
    );

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400"
    );
    return res.end(template);
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.end(`prerender error: ${e?.message || e}`);
  }
}
