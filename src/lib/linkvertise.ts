const DEFAULT_LINKVERTISE_USER_ID = 405401;

// Languages that have a /public/verify-gate-<lang>.html gate page (lowercased codes).
const GATE_LANGS = ["en", "fr", "th", "ko", "zh-cn", "de", "ru", "id", "pt", "fil", "es", "vi"];

/** Extracts the numeric Linkvertise account id from any pasted Linkvertise link. */
function extractUserId(adminLink?: string | null): number {
  if (!adminLink) return DEFAULT_LINKVERTISE_USER_ID;
  const m = adminLink.match(/(\d{4,})/);
  return m ? Number(m[1]) : DEFAULT_LINKVERTISE_USER_ID;
}

/**
 * Wrap the real destination in a tiny language-specific gate page. Linkvertise scrapes
 * the *destination's* <title>/OG tags to build its preview card — pointing it straight
 * at our SPA made it show the site's SEO title ("ComboWick Roblox Scripts…"). The gate
 * page carries a clean branded title ("Get COMBO_WICK Key (Official Verification)") in
 * the visitor's language, then instantly forwards them to the real return URL.
 */
function gateTarget(targetUrl: string): string {
  if (typeof window === "undefined") return targetUrl;
  const raw = (localStorage.getItem("combowick-lang") || "en").toLowerCase();
  const lang = GATE_LANGS.includes(raw) ? raw : "en";
  return `${window.location.origin}/verify-gate-${lang}.html?to=${encodeURIComponent(targetUrl)}`;
}

/**
 * Builds a Linkvertise dynamic link that redirects to `targetUrl` after completion.
 * The (gated) target is base64-encoded into the `r` param so it survives the off-site
 * round trip and comes back to us intact.
 */
export function buildLinkvertiseUrl(adminLink: string | null | undefined, targetUrl: string): string {
  const userId = extractUserId(adminLink);
  const random = Math.floor(Math.random() * 1_000_000);
  const base64Target = btoa(gateTarget(targetUrl));
  return `https://link-to.net/${userId}/${random}/dynamic?r=${base64Target}`;
}

/** Legacy helper kept for compatibility — uses the default account id. */
export function generateLinkvertiseUrl(targetUrl: string): string {
  return buildLinkvertiseUrl(null, targetUrl);
}
