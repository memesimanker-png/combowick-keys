const DEFAULT_LINKVERTISE_USER_ID = 405401;

/** Extracts the numeric Linkvertise account id from any pasted Linkvertise link. */
function extractUserId(adminLink?: string | null): number {
  if (!adminLink) return DEFAULT_LINKVERTISE_USER_ID;
  const m = adminLink.match(/(\d{4,})/);
  return m ? Number(m[1]) : DEFAULT_LINKVERTISE_USER_ID;
}

/**
 * Builds a Linkvertise dynamic link that redirects to `targetUrl` after completion.
 * The target (which carries our own tokens/return path) is base64-encoded into the
 * `r` param, so it survives the off-site round trip and comes back to us intact.
 */
export function buildLinkvertiseUrl(adminLink: string | null | undefined, targetUrl: string): string {
  const userId = extractUserId(adminLink);
  const random = Math.random() * 1000;
  const base64Target = btoa(targetUrl);
  return `https://link-to.net/${userId}/${random}/dynamic?r=${base64Target}`;
}

/** Legacy helper kept for compatibility — uses the default account id. */
export function generateLinkvertiseUrl(targetUrl: string): string {
  return buildLinkvertiseUrl(null, targetUrl);
}
