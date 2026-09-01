// Monetag Direct Link helper.
// The OLD account's direct-link zone (omg10.com/4/11035707) was removed so the new
// Monetag account (verified via the meta tag in index.html) can serve instead.
// To re-enable a direct link, set DIRECT_LINK_URL to your NEW Monetag zone URL.

const DIRECT_LINK_URL = ""; // TODO: paste new Monetag Direct Link URL to re-enable
const CAP_MS = 3 * 60 * 1000; // 3 minutes between hops, site-wide
const STORAGE_KEY = "dl_last_at";

export function canFireDirectLink(): boolean {
  if (!DIRECT_LINK_URL) return false;
  try {
    const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
    return Date.now() - last > CAP_MS;
  } catch {
    return false;
  }
}

/**
 * Opens the Direct Link in a background tab if a URL is configured and the
 * frequency cap allows. No-op while DIRECT_LINK_URL is empty.
 */
export function maybeFireDirectLink(): boolean {
  if (!DIRECT_LINK_URL || !canFireDirectLink()) return false;
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    const w = window.open(DIRECT_LINK_URL, "_blank", "noopener,noreferrer");
    if (w && typeof w.blur === "function") { try { w.blur(); } catch {} }
    try { window.focus(); } catch {}
    return true;
  } catch {
    return false;
  }
}
