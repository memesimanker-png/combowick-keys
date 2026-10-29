// Vercel serverless prerender for /scripts/:slug.
// Returns full HTML with meta tags + visible body content so search engines
// and social crawlers index game-keyword pages without executing JS.
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

// Same project as the sitemap/llms (the store, sqahviibykrzlwnulgmw). It used to fall back to the OLD combowick.com
// project, which has none of the current scripts, so every bot got a 404 for every script page (fixed 2026-10-29).
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://sqahviibykrzlwnulgmw.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYWh2aWlieWtyemx3bnVsZ213Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODAxNjQsImV4cCI6MjEwMzg1NjE2NH0.mvRGR-d3EOcy8bBlCTDwIHEF4ELIU9PfVXDi8NSALlA";
// Canonical host. Was hardcoded to combowick.com — which told Google to index these
// pages on a different domain. Now matches the SPA's own domain (override with SITE_URL env).
const BASE_URL = (process.env.SITE_URL || "https://keys.combowick.com").replace(/\/$/, "");

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
        "slug,title,description,long_description,game,game_universe_id,game_url,is_paid,updated_at,created_at,thumbnail_url,category,faqs"
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
    // script.title is "<Game> — COMBO_WICK | <features>"; only the features part goes in the page title
    // (it used to repeat the game name twice).
    const feats = String(script.title || "").split("|").slice(1).join("|").trim() || String(script.title || "");
    const month = new Date().toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    const noKey = !script.is_paid;
    const title = `${game} Script${noKey ? " No Key" : ""} (${month}) – ${feats} | ComboWick`;
    const description =
      `${script.description || `COMBO_WICK ${game} script for Roblox.`} Free COMBO_WICK ${game} script for Roblox, mobile and PC${noKey ? ", free session with no key" : ""}.`.slice(0, 300);
    const longText = String(script.long_description || script.description || "")
      .slice(0, 2000);
    // Real feature list = the owner's "- " lines in long_description (no generic filler).
    const featureList = longText
      .split("\n")
      .filter((l) => /^\s*-\s+/.test(l))
      .map((l) => l.replace(/^\s*-\s+/, "").trim())
      .filter(Boolean);
    const intro = longText.split("\n").filter((l) => l.trim() && !/^\s*-\s+/.test(l) && !/^features:?$/i.test(l.trim()) && !/Features:$/.test(l.trim()));

    const jsonLd = [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareSourceCode",
        name: `${game} Script — ${script.title}`,
        description: longText || script.description,
        programmingLanguage: "Lua",
        runtimePlatform: "Roblox",
        codeRepository: canonical,
        author: {
          "@type": "Organization",
          "@id": "https://combowick.com/#org",
          name: "ComboWick",
          alternateName: ["Combo_WICK", "COMBO_WICK", "Combo Wick"],
          url: "https://combowick.com",
          sameAs: [
            "https://www.youtube.com/@Triple_WICK",
            "https://discord.gg/ufrz9Zaqs8",
            "https://scriptblox.com/u/COMBO_WOOCK",
            "https://rscripts.net/@ComboWick",
            "https://keys.combowick.com",
          ],
        },
        about: {
          "@type": "VideoGame",
          name: game,
          gamePlatform: "Roblox",
          ...(script.game_url ? { url: script.game_url } : {}),
        },
        keywords: [game, `${game} script`, `${game} script no key`, `${game} roblox script`, feats].join(", "),
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

    // FAQPage — wins the FAQ rich-snippet dropdown on "[game] script" results (big CTR).
    const faqs = Array.isArray(script.faqs) ? script.faqs : [];
    const validFaqs = faqs.filter((f: any) => f && f.question && f.answer).slice(0, 10);
    validFaqs.push(
      {
        question: `Does the ${game} script need a key?`,
        answer: noKey
          ? `No key is needed to start. Finish the short unlock step on this page, copy the loadstring, and the script runs as a free timed session. After it ends you can get a free key (short checkpoints, 8 hours, one game) or a Premium key for every game with no checkpoints.`
          : `Yes, this is a paid script. It needs a key made for ${game}.`,
      },
      {
        question: `Does the ${game} script work on mobile?`,
        answer: `Yes. The COMBO_WICK menu works on phones and tablets as well as PC, with an up-to-date executor (see the executors page).`,
      },
      {
        question: `Can I get banned for using the ${game} script?`,
        answer: `Any Roblox script breaks the Roblox Terms of Use, so a ban is always possible. Use an alt account.`,
      },
      {
        question: "What is Combo Wick?",
        answer: `Combo Wick (ComboWick, Combo_WICK) is a Roblox script hub that makes scripts like this ${game} script. Keys and Premium are on keys.combowick.com. It is not the Magic: The Gathering card "Wick".`,
      }
    );
    if (validFaqs.length) {
      jsonLd.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: validFaqs.map((f: any) => ({
          "@type": "Question",
          name: String(f.question),
          acceptedAnswer: { "@type": "Answer", text: String(f.answer) },
        })),
      });
    }

    const headTags = `
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <meta name="keywords" content="${esc(`${game}, ${game} script, ${game} script no key, ${game} roblox script, ${feats}`)}" />
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
<div id="seo-prerender">
  <h1>${esc(game)} Script${noKey ? " No Key" : ""} (${esc(month)}) – ${esc(feats)}</h1>
  <p><strong>${esc(description)}</strong></p>
  ${intro.map((p) => `<p>${esc(p)}</p>`).join("\n  ")}
  ${featureList.length ? `<h2>${esc(game)} script features</h2>\n  <ul>${featureList.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
  <h2>How to use the ${esc(game)} script</h2>
  <ol>
    <li>Finish the short unlock step on this page to see the loadstring.</li>
    <li>Join ${esc(game)} on Roblox${script.game_url ? ` (<a href="${esc(script.game_url)}">game link</a>)` : ""} and open your executor.</li>
    <li>Paste the loadstring and press Execute. The COMBO_WICK menu opens.</li>
    ${noKey ? `<li>When the free session ends, get a free key or a <a href="/premium-keys">Premium key</a>.</li>` : ""}
  </ol>
  <p>Last updated ${esc(String(script.updated_at || "").slice(0, 10))}. By COMBO_WICK (ComboWick).</p>
  ${validFaqs.length ? `<h2>${esc(game)} script FAQ</h2>${validFaqs.map((f: any) => `<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`).join("")}` : ""}
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
