// Lightweight engagement tracking. Sends scroll-depth, click and route-change
// events to Google Analytics / GTM if present on the page (window.gtag or
// window.dataLayer). No-ops gracefully when no analytics tag is loaded, so it
// is safe to ship regardless of how GA is wired up.
//
// Why: SPA route changes don't fire a second pageview, and a visitor who reads
// and scrolls but never triggers a second hit is counted as a "bounce". Firing
// scroll/click engagement events lets GA mark these sessions as engaged.

type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackEvent(name: string, params: Params = {}) {
  try {
    if (typeof window === "undefined") return;
    if (typeof window.gtag === "function") {
      window.gtag("event", name, params);
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: name, ...params });
    }
  } catch {
    /* analytics must never break the app */
  }
}

export function trackPageView(path: string) {
  trackEvent("page_view", { page_path: path, page_location: location.href });
}
