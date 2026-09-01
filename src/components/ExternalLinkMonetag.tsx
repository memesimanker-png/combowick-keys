import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { maybeFireDirectLink } from "@/lib/monetag";

// Routes where Direct Link must NEVER fire (AdSense policy + already-monetized verify pages).
const BLOCKED_PREFIXES = [
  "/verify",
  "/access-key",
  "/claim-access",
  "/premium-keys",
  "/keys",
  "/ad-return",
  "/login",
  "/signup",
  "/register",
];

// Domains we never wrap (own domain, payment, auth providers).
const SAFE_DOMAINS = [
  "combowick.com",
  "shop-ready.lovable.app",
  "lovable.app",
  "paypal.com",
  "google.com",
  "accounts.google.com",
  "youtube.com",
  "youtu.be",
];

function isSafeUrl(href: string): boolean {
  try {
    const u = new URL(href, window.location.origin);
    if (u.origin === window.location.origin) return true;
    return SAFE_DOMAINS.some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`));
  } catch {
    return true;
  }
}

/**
 * Mounts a single document-level click listener that fires the rate-capped Monetag
 * Direct Link in a background tab when the user clicks an EXTERNAL link
 * (Discord, executor downloads, etc.). The original navigation is never blocked.
 */
export function ExternalLinkMonetag() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (BLOCKED_PREFIXES.some((p) => pathname.startsWith(p))) return;

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href) return;
      // Only external links opening in new tab
      if (a.target !== "_blank") return;
      if (isSafeUrl(href)) return;
      // Fire monetag in the background — does not affect the user's click.
      maybeFireDirectLink();
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true } as any);
  }, [pathname]);

  return null;
}
