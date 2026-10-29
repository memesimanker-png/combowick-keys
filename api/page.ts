// Bot-only HTML for the main SPA routes (/scripts, /executors, /premium-keys, /request).
// The SPA serves one shared shell to every route, so crawlers that don't run JS (GPTBot, ClaudeBot,
// PerplexityBot...) saw the same title and no page text. vercel.json rewrites those routes here for
// bot user agents only (same pattern as api/script.ts). Content mirrors what each page shows.
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://sqahviibykrzlwnulgmw.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYWh2aWlieWtyemx3bnVsZ213Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyODAxNjQsImV4cCI6MjEwMzg1NjE2NH0.mvRGR-d3EOcy8bBlCTDwIHEF4ELIU9PfVXDi8NSALlA";
const BASE = (process.env.SITE_URL || "https://keys.combowick.com").replace(/\/$/, "");
// Keep in sync with supabase/functions/_shared/key-pricing.ts BASE_PRICE (sales can lower these).
const PRICES = { trial: 5, monthly: 9.99, lifetime: 49.99 };

const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ORG = {
  "@type": "Organization",
  "@id": "https://combowick.com/#org",
  name: "ComboWick",
  alternateName: ["Combo_WICK", "COMBO_WICK", "Combo Wick", "combowick"],
  url: "https://combowick.com",
  logo: "https://combowick.com/images/combo-wick-logo.png",
  description:
    "ComboWick (Combo_WICK) is a Roblox script hub that makes Lua scripts for Roblox games, with a free key system and Premium keys at keys.combowick.com.",
  sameAs: [
    "https://www.youtube.com/@Triple_WICK",
    "https://discord.gg/ufrz9Zaqs8",
    "https://scriptblox.com/u/COMBO_WOOCK",
    "https://rscripts.net/@ComboWick",
    "https://keys.combowick.com",
  ],
};

const BRAND_FAQ: [string, string][] = [
  [
    "What is Combo Wick?",
    'Combo Wick (also written ComboWick or Combo_WICK) is a Roblox script hub. It makes Lua scripts for Roblox games, runs a free key system and sells Premium keys at keys.combowick.com, and posts videos on YouTube (@Triple_WICK). It is not the Magic: The Gathering card "Wick, the Whorled Mind".',
  ],
  [
    "Is ComboWick the same as Combo_WICK?",
    "Yes. ComboWick, Combo_WICK, COMBO_WICK and Combo Wick are the same Roblox script hub. The official sites are keys.combowick.com and combowick.com, and the Discord is discord.gg/ufrz9Zaqs8.",
  ],
];

const month = () => new Date().toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const today = () => new Date().toISOString().slice(0, 10);

function shell(o: { path: string; title: string; description: string; body: string; ld: any[] }) {
  const url = `${BASE}${o.path}`;
  const graph = [ORG, ...o.ld];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ComboWick">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}/images/combo-wick-logo.png">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")}</script>
</head>
<body>
<header><nav><a href="/">ComboWick</a> · <a href="/scripts">Scripts</a> · <a href="/executors">Executors</a> · <a href="/premium-keys">Premium keys</a> · <a href="/request">Request a script</a> · <a href="https://combowick.com/roblox">All game scripts</a></nav></header>
<main>
${o.body}
</main>
<footer><p>ComboWick (also written Combo_WICK or Combo Wick) makes Roblox scripts. Not affiliated with Roblox Corporation. Using scripts breaks the Roblox Terms of Use and can get an account banned. <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/refund-policy">Refund policy</a> · <a href="https://discord.gg/ufrz9Zaqs8">Discord</a></p></footer>
</body>
</html>`;
}

const crumbs = (name: string, path: string) => ({
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
    { "@type": "ListItem", position: 2, name, item: `${BASE}${path}` },
  ],
});
const faqLd = (faqs: [string, string][]) => ({
  "@type": "FAQPage",
  mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
});
const faqHtml = (faqs: [string, string][]) => faqs.map(([q, a]) => `<h3>${esc(q)}</h3>\n<p>${esc(a)}</p>`).join("\n");

// "Kaiju Alpha — COMBO_WICK | Auto Farm, Cell Spoofer" -> "Auto Farm, Cell Spoofer"
const featuresOf = (title: string) => String(title || "").split("|").slice(1).join("|").trim() || String(title || "");

async function scriptsPage() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data } = await supabase
    .from("scripts")
    .select("slug,title,description,game,updated_at,is_paid")
    .order("updated_at", { ascending: false })
    .limit(500);
  const list = (data || []).filter((s: any) => s.slug && !s.is_paid);
  const games = [...new Set(list.map((s: any) => s.game))];
  const m = month();
  const faqs: [string, string][] = [
    ["Are ComboWick scripts free?", "Yes. Every script on this page is free. Each script page has a short unlock step, then the script starts as a free timed session with no key. After that you can get a free key or a Premium key."],
    ["How do I run a ComboWick script?", "Open the script page, finish the unlock step, copy the loadstring, join the game on Roblox, paste it into your executor and press Execute. The COMBO_WICK menu opens in the game."],
    ["Do the scripts work on mobile?", "Yes. The COMBO_WICK menu works on phones and tablets as well as PC, with an up-to-date executor. See the executors page for which ones are working today."],
    ...BRAND_FAQ,
  ];
  const body = `<h1>Roblox Scripts No Key (${esc(m)}) — ${list.length} ComboWick game scripts</h1>
<p>Updated ${esc(today())}. Free COMBO_WICK scripts for ${esc(games.slice(0, 6).join(", "))}${games.length > 6 ? " and more" : ""}. Every script works on mobile and PC executors and starts as a free session with no key.</p>
<ul>
${list.map((s: any) => `<li><a href="/scripts/${esc(s.slug)}"><strong>${esc(s.game)} script</strong></a> — ${esc(featuresOf(s.title))}. ${esc(s.description || "")}</li>`).join("\n")}
</ul>
<p>More games (with the full feature list of each script): <a href="https://combowick.com/roblox">all COMBO_WICK Roblox game scripts</a>.</p>
<h2>FAQ</h2>
${faqHtml(faqs)}`;
  return shell({
    path: "/scripts",
    title: `Roblox Scripts No Key (${m}) – ${list.length} Free ComboWick Scripts | Mobile`,
    description: `${list.length} free COMBO_WICK Roblox scripts for ${games.slice(0, 4).join(", ")} and more. Mobile and PC, free session with no key. Updated ${m}.`,
    body,
    ld: [
      {
        "@type": "CollectionPage",
        name: `ComboWick Roblox scripts (${m})`,
        url: `${BASE}/scripts`,
        dateModified: today(),
        publisher: { "@id": "https://combowick.com/#org" },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: list.map((s: any, i: number) => ({ "@type": "ListItem", position: i + 1, url: `${BASE}/scripts/${s.slug}`, name: `${s.game} script` })),
        },
      },
      crumbs("Scripts", "/scripts"),
      faqLd(faqs),
    ],
  });
}

async function executorsPage() {
  let list: any[] = [];
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/executors-online`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: "{}",
    });
    const j = await r.json();
    list = (j?.data || []).filter((e: any) => !e.hidden);
  } catch { /* render the page without the table */ }
  const plat = (e: any) => {
    const t = String(e.extype || "").toLowerCase();
    return t.startsWith("a") ? "Android" : t.startsWith("i") ? "iOS" : t.startsWith("m") ? "Mac" : "Windows";
  };
  const kind = (e: any) => (/external/i.test(e.extype || "") ? "External" : "Executor");
  const order = ["Android", "iOS", "Windows", "Mac"];
  list.sort((a, b) => order.indexOf(plat(a)) - order.indexOf(plat(b)) || Number(!!b.updateStatus) - Number(!!a.updateStatus));
  const working = list.filter((e) => e.updateStatus && kind(e) === "Executor");
  const m = month();
  const faqs: [string, string][] = [
    ["Which Roblox executors work right now?", working.length ? `Up to date for the current Roblox version as of ${today()}: ${working.map((e) => `${e.title} (${plat(e)}${e.free ? ", free" : ""})`).join(", ")}.` : "See the live table on this page."],
    ["What is the best free executor for mobile?", (() => { const a = working.filter((e) => plat(e) === "Android" && e.free).map((e) => e.title); return a.length ? `On Android, ${a.join(" and ")} ${a.length > 1 ? "are" : "is"} free and up to date as of ${today()}.` : "Check the Android rows of the table; status changes after every Roblox update."; })()],
    ["Do ComboWick scripts work with these executors?", "Yes. COMBO_WICK scripts run on any up-to-date executor that supports loadstring and HttpGet, on PC and mobile."],
  ];
  const rows = list
    .map((e) => `<tr><td>${esc(e.title)}</td><td>${plat(e)}</td><td>${kind(e)}</td><td>${e.free ? "Free" : "Paid"}</td><td>${e.updateStatus ? "Yes" : "No"}</td><td>${e.uncPercentage != null ? esc(e.uncPercentage) + "%" : "-"}</td><td>${esc(e.version || "-")}</td></tr>`)
    .join("\n");
  const body = `<h1>Roblox Executors Status (${esc(m)}) — Working PC, Android, iOS &amp; Mac Executors</h1>
<p>Live status, checked ${esc(today())}. "Up to date" means the executor supports the current Roblox version. Status changes after every Roblox update.</p>
<table>
<tr><th>Executor</th><th>Device</th><th>Type</th><th>Price</th><th>Up to date</th><th>UNC</th><th>Version</th></tr>
${rows}
</table>
<h2>FAQ</h2>
${faqHtml(faqs)}
<p>Then get a script: <a href="/scripts">ComboWick Roblox scripts</a>.</p>`;
  return shell({
    path: "/executors",
    title: `Roblox Executors Status (${m}) – Working Executors for PC, Android, iOS | ComboWick`,
    description: `Which Roblox executors work today: ${working.slice(0, 5).map((e) => e.title).join(", ")} and more. Live up-to-date status, free vs paid, UNC score, for Windows, Android, iOS and Mac.`,
    body,
    ld: [
      { "@type": "WebPage", name: `Roblox executors status (${m})`, url: `${BASE}/executors`, dateModified: today(), publisher: { "@id": "https://combowick.com/#org" } },
      crumbs("Executors", "/executors"),
      faqLd(faqs),
    ],
  });
}

function premiumPage() {
  const faqs: [string, string][] = [
    ["What does a ComboWick Premium key do?", "One Premium key works in every COMBO_WICK game, with no checkpoints, no ads and no cooldown."],
    ["How much is a Premium key?", `7-day trial $${PRICES.trial}, monthly $${PRICES.monthly}, lifetime $${PRICES.lifetime}. Sales sometimes lower these prices; the price on the page is the one you pay.`],
    ["How do I pay?", "PayPal, any debit or credit card, or Payoneer. PayPal and card keys show on screen right away and are emailed to you."],
    ["Can I get a refund?", "Sales are final, but a key that doesn't work is replaced. See the refund policy and the Fix Key page."],
    ["What is the difference between a free key and Premium?", "A free key takes a few short checkpoints and works for 8 hours in one game. Premium skips the checkpoints and works in every game."],
  ];
  const body = `<h1>ComboWick Premium Keys — plans from $${PRICES.trial}</h1>
<p>One key for every COMBO_WICK Roblox script. No checkpoints, no ads, no cooldown.</p>
<table>
<tr><th>Plan</th><th>Price</th><th>Length</th></tr>
<tr><td>Trial</td><td>$${PRICES.trial}</td><td>7 days</td></tr>
<tr><td>Monthly</td><td>$${PRICES.monthly}</td><td>30 days (one-time payment, not a subscription)</td></tr>
<tr><td>Lifetime</td><td>$${PRICES.lifetime}</td><td>Forever</td></tr>
</table>
<h2>Free key vs Premium</h2>
<table>
<tr><th></th><th>Free key</th><th>Premium</th></tr>
<tr><td>Checkpoints / ads</td><td>A few short checkpoints</td><td>None</td></tr>
<tr><td>Length</td><td>8 hours</td><td>Trial, monthly or lifetime</td></tr>
<tr><td>Games</td><td>One game</td><td>Every COMBO_WICK game</td></tr>
</table>
<p>Need a script made just for you? Custom scripts get a free quote on <a href="https://discord.gg/ufrz9Zaqs8">Discord</a>.</p>
<h2>FAQ</h2>
${faqHtml(faqs)}
<p><a href="/refund-policy">Refund policy</a> · <a href="/fix-key">Fix a key</a> · <a href="/scripts">Scripts</a></p>`;
  return shell({
    path: "/premium-keys",
    title: `ComboWick Premium Keys – Plans from $${PRICES.trial} (Trial, Monthly, Lifetime)`,
    description: `ComboWick Premium key: one key for every Roblox game script, no checkpoints or ads. 7-day trial $${PRICES.trial}, monthly $${PRICES.monthly}, lifetime $${PRICES.lifetime}. Pay with PayPal, card or Payoneer.`,
    body,
    ld: [
      {
        "@type": "Product",
        name: "ComboWick Premium Key",
        brand: { "@id": "https://combowick.com/#org" },
        description: "One key for every COMBO_WICK Roblox script, with no checkpoints, ads or cooldown.",
        offers: [
          { "@type": "Offer", name: "7-day trial", price: PRICES.trial, priceCurrency: "USD", url: `${BASE}/premium-keys`, availability: "https://schema.org/InStock" },
          { "@type": "Offer", name: "Monthly", price: PRICES.monthly, priceCurrency: "USD", url: `${BASE}/premium-keys`, availability: "https://schema.org/InStock" },
          { "@type": "Offer", name: "Lifetime", price: PRICES.lifetime, priceCurrency: "USD", url: `${BASE}/premium-keys`, availability: "https://schema.org/InStock" },
        ],
      },
      crumbs("Premium keys", "/premium-keys"),
      faqLd(faqs),
    ],
  });
}

function requestPage() {
  const faqs: [string, string][] = [
    ["How do I request a Roblox script?", "Paste the Roblox game link or type its name on the request page, then send the request. If someone already asked for it, your vote is added instead."],
    ["Which requested games get made?", "The most-voted games get made first. New scripts show up on the scripts page and on the ComboWick Discord."],
    ["Is requesting free?", "Yes. Requesting and voting are free; every account gets one vote per game. If you requested a game and post a 3 to 5 minute video of its script on YouTube or TikTok within 48 hours, an approved video earns a free 1-week key."],
  ];
  const body = `<h1>Request a Roblox Script — vote for the next game</h1>
<p>Ask ComboWick to make a script for any Roblox game, or vote for games other people asked for.</p>
<ol>
<li><strong>Find your game:</strong> paste the Roblox link or type the game's name.</li>
<li><strong>Request or vote:</strong> every account gets one vote per game.</li>
<li><strong>We build it:</strong> the top games get made first. You'll see it on the scripts page and on Discord.</li>
<li><strong>Post a video:</strong> if you requested it, post a 3 to 5 minute video on YouTube or TikTok within 48 hours. An approved video earns a free 1-week key.</li>
</ol>
<h2>FAQ</h2>
${faqHtml(faqs)}
<p>Already made: <a href="/scripts">current scripts</a> · <a href="https://combowick.com/roblox">all game scripts</a></p>`;
  return shell({
    path: "/request",
    title: "Request a Roblox Script – Vote for the Next Game | ComboWick",
    description: "Request a free Roblox script for any game and vote for others. The most-voted games get a ComboWick script first.",
    body,
    ld: [crumbs("Request a script", "/request"), faqLd(faqs)],
  });
}

export default async function handler(req: any, res: any) {
  try {
    const route = String((req.query && req.query.route) || new URL(req.url, "https://x").searchParams.get("route") || "");
    let html: string | null = null;
    if (route === "scripts") html = await scriptsPage();
    else if (route === "executors") html = await executorsPage();
    else if (route === "premium-keys") html = premiumPage();
    else if (route === "request") html = requestPage();
    if (!html) {
      res.statusCode = 404;
      return res.end("not found");
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400");
    return res.end(html);
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.end(`prerender error: ${e?.message || e}`);
  }
}
