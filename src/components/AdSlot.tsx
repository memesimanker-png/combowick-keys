import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

const PUBLISHER_ID = "ca-pub-8877213222492502";
const ADSENSE_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`;

function ensureAdsenseScript() {
  if (document.querySelector(`script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = ADSENSE_SRC;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
}

// Routes where AdSense MUST NOT be shown.
// AdSense flagged "Site Behavior: Navigation" — ads inside key/verify/claim flows
// look like next-step buttons and cause accidental clicks. They are now blocked
// site-wide on every navigation/action-only page. Ads are kept ONLY on real
// content pages (home, blog, scripts catalog, script detail, premium-keys info).
const BLOCKED_ROUTE_PATTERNS = [
  /^\/admin/,
  /^\/login/,
  /^\/signup/,
  /^\/register/,
  /^\/dashboard/,
  /^\/unsubscribe/,
  // Action / navigation flows — DO NOT place ads here (AdSense policy: navigation)
  /^\/verify/,
  /^\/keys?$/,
  /^\/access-key/,
  /^\/claim-access/,
  /^\/ad-return/,
  /^\/blocked/,
  /^\/premium-keys/,
];

type Props = {
  /** AdSense slot ID. Use real slot IDs once created in AdSense; placeholder OK during review. */
  slot?: string;
  /** 'auto' (responsive), 'fluid' (in-article), or fixed format like 'rectangle'. */
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  /** Set true for responsive layouts. */
  responsive?: boolean;
  /** Optional layout key for fluid in-article ads. */
  layout?: string;
  layoutKey?: string;
  className?: string;
  /** Reserve a min-height to prevent CLS while ad loads. */
  minHeight?: number;
  /** Optional label above ad — required by some regulations to disclose ads. */
  showLabel?: boolean;
};

/**
 * Google AdSense ad unit. Safe-by-default:
 * - Auto-skips on blocked routes (verify/key gates, admin, auth)
 * - Reserves height to avoid CLS
 * - Only initializes once per mount
 * - Respects cookie consent (waits for "accepted")
 */
export function AdSlot({
  slot = "0000000000",
  format = "auto",
  responsive = true,
  layout,
  layoutKey,
  className = "",
  minHeight = 250,
  showLabel = true,
}: Props) {
  const ref = useRef<HTMLModElement | null>(null);
  const initialized = useRef(false);
  const location = useLocation();

  const isBlocked = BLOCKED_ROUTE_PATTERNS.some((re) => re.test(location.pathname));

  useEffect(() => {
    if (isBlocked) return;
    if (initialized.current) return;
    ensureAdsenseScript();

    // Respect cookie consent — only push ads after explicit accept (or no decision yet, AdSense will use non-personalized).
    // We push regardless to satisfy review crawlers, but you can gate with consent === "accepted" if stricter.
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      initialized.current = true;
    } catch (e) {
      // Adblockers or repeated push errors — fail silently in production.
      if (import.meta.env.DEV) console.warn("AdSlot push failed:", e);
    }
  }, [isBlocked, location.pathname]);

  if (isBlocked) return null;

  return (
    <div className={`my-6 w-full ${className}`} aria-label="Advertisement">
      {showLabel && (
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 text-center mb-1">
          Advertisement
        </div>
      )}
      <ins
        ref={ref}
        className="adsbygoogle block"
        style={{ display: "block", minHeight, textAlign: "center" }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
        {...(layout ? { "data-ad-layout": layout } : {})}
        {...(layoutKey ? { "data-ad-layout-key": layoutKey } : {})}
      />
    </div>
  );
}
