/**
 * In-app browser detection (owner 2026-11-10): players doing the free-key steps inside an app's built-in browser
 * (YouTube, Discord, TikTok, Instagram, Google app...) lose their progress when Linkvertise hops them out to the real
 * browser and back, so the site says they skipped steps. In Chrome it works. We detect those browsers and offer
 * a one-tap "Open in Chrome".
 */
export type InAppInfo = { inApp: boolean; app: string; os: "android" | "ios" | "other" };

export function detectInApp(ua: string = typeof navigator !== "undefined" ? navigator.userAgent : ""): InAppInfo {
  const os: InAppInfo["os"] = /Android/i.test(ua) ? "android" : /iPhone|iPad|iPod/i.test(ua) ? "ios" : "other";
  const apps: [RegExp, string][] = [
    [/FBAN|FBAV|FB_IAB|FBIOS/i, "Facebook"],
    [/Instagram/i, "Instagram"],
    [/musical_ly|Bytedance|TikTok|aweme/i, "TikTok"],
    [/Discord/i, "Discord"],
    [/YouTube/i, "YouTube"],
    [/Snapchat/i, "Snapchat"],
    [/\bLine\//i, "LINE"],
    [/Twitter/i, "X"],
    [/GSA\//i, "Google"],
  ];
  for (const [re, name] of apps) if (re.test(ua)) return { inApp: true, app: name, os };
  // Android WebView marks itself with "; wv)"; iOS WebViews have no "Safari/" token (Safari and Chrome on iOS do)
  if (os === "android" && /;\s*wv\)/i.test(ua)) return { inApp: true, app: "", os };
  if (os === "ios" && /AppleWebKit/i.test(ua) && !/Safari\//i.test(ua)) return { inApp: true, app: "", os };
  return { inApp: false, app: "", os };
}

/** A link that opens `url` in Chrome: Android intent (falls back to the same page), iOS Chrome scheme. */
export function chromeUrl(url: string, os: InAppInfo["os"]): string {
  try {
    const u = new URL(url);
    const rest = u.host + u.pathname + u.search + u.hash;
    if (os === "android") return `intent://${rest}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
    if (os === "ios") return `googlechromes://${rest}`;
  } catch { /* fall through */ }
  return url;
}
