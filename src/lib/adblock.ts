// Ad-blocker detection for the free-key flow (Monetag popunder / direct link pay for free keys).
//
// A visitor counts as "blocking" only when TWO independent signals agree, so a Monetag outage or a
// slow network never locks a normal visitor out:
//   1. the real Monetag tag script can't be fetched (Brave Shields, uBlock, AdBlock, AdGuard,
//      Pi-hole / AdGuard DNS all kill this request), AND
//   2. either a classic ad script (Google ads) can't be fetched, or a bait "ad" element gets hidden.
// Timeouts count as NOT blocked (benefit of the doubt).

const MONETAG_PROBE = "https://al5sm.com/tag.min.js";
const GOOGLE_PROBE = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
const TIMEOUT_MS = 4000;

// "blocked" = request rejected (what blockers do); "ok" = reached; "timeout" = unknown.
type Probe = "blocked" | "ok" | "timeout";

function probe(url: string): Promise<Probe> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (r: Probe) => { if (!done) { done = true; resolve(r); } };
    const timer = window.setTimeout(() => finish("timeout"), TIMEOUT_MS);
    fetch(`${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`, { mode: "no-cors", cache: "no-store", credentials: "omit" })
      .then(() => finish("ok"))
      .catch(() => finish("blocked"))
      .finally(() => window.clearTimeout(timer));
  });
}

function baitHidden(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const bait = document.createElement("div");
      bait.className = "adsbox ad-banner ad-placement pub_300x250 pub_728x90 text-ad textads banner-ads sponsored-ad";
      bait.setAttribute("aria-hidden", "true");
      bait.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:300px;height:250px;pointer-events:none;";
      bait.innerHTML = "&nbsp;";
      document.body.appendChild(bait);
      window.setTimeout(() => {
        let hidden = false;
        try {
          const cs = window.getComputedStyle(bait);
          hidden = bait.offsetHeight === 0 || bait.offsetParent === null || cs.display === "none" || cs.visibility === "hidden";
        } catch {}
        bait.remove();
        resolve(hidden);
      }, 150);
    } catch {
      resolve(false);
    }
  });
}

export function isBraveBrowser(): boolean {
  return typeof (navigator as any).brave?.isBrave === "function";
}

export async function detectAdBlock(): Promise<boolean> {
  const [monetag, google, bait] = await Promise.all([probe(MONETAG_PROBE), probe(GOOGLE_PROBE), baitHidden()]);
  if (monetag !== "blocked") return false;
  return google === "blocked" || bait;
}
