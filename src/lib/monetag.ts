// Global Monetag Direct Link helper.
// Strategy: low-annoyance, high-yield. Fires AT MOST once per CAP_MS site-wide,
// always in a background tab so the user's intended action is never interrupted.
// Use maybeFireDirectLink() to wrap any high-intent click (copy, external link, download).

const DIRECT_LINK_URL = "https://omg10.com/4/11035707";
const CAP_MS = 3 * 60 * 1000; // 3 minutes between hops, site-wide
const STORAGE_KEY = "dl_last_at";

export function canFireDirectLink(): boolean {
  try {
    const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
    return Date.now() - last > CAP_MS;
  } catch {
    return false;
  }
}

/**
 * Opens the Direct Link in a background tab if frequency cap allows.
 * Returns true if it fired. Non-blocking — the original action should always proceed.
 */
export function maybeFireDirectLink(): boolean {
  if (!canFireDirectLink()) return false;
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    // _blank + noopener => opens in new tab; most browsers keep it backgrounded
    // when triggered by a real user gesture without focus().
    const w = window.open(DIRECT_LINK_URL, "_blank", "noopener,noreferrer");
    // Refocus current tab so the ad stays in the background.
    if (w && typeof w.blur === "function") {
      try { w.blur(); } catch {}
    }
    try { window.focus(); } catch {}
    return true;
  } catch {
    return false;
  }
}
