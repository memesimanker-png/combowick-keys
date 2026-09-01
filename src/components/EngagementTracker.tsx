import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent, trackPageView } from "@/lib/analytics";

/**
 * Mount once inside the router. Fires:
 * - page_view on every SPA route change
 * - scroll_depth at 25/50/75/100% (engagement signal — kills false bounces)
 * - first_engagement on first meaningful click/keypress
 * Reset per route so each page measures its own engagement.
 */
export function EngagementTracker() {
  const location = useLocation();
  const reached = useRef<Set<number>>(new Set());
  const engaged = useRef(false);

  // Page view + reset thresholds on navigation
  useEffect(() => {
    trackPageView(location.pathname + location.search);
    reached.current = new Set();
    engaged.current = false;
  }, [location.pathname, location.search]);

  // Scroll-depth tracking
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      if (scrollable <= 0) return;
      const pct = Math.round((window.scrollY / scrollable) * 100);
      for (const t of [25, 50, 75, 100]) {
        if (pct >= t && !reached.current.has(t)) {
          reached.current.add(t);
          trackEvent("scroll_depth", { percent: t, page_path: location.pathname });
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  // First meaningful interaction
  useEffect(() => {
    const onInteract = () => {
      if (engaged.current) return;
      engaged.current = true;
      trackEvent("first_engagement", { page_path: location.pathname });
    };
    window.addEventListener("click", onInteract, { passive: true });
    window.addEventListener("keydown", onInteract, { passive: true });
    return () => {
      window.removeEventListener("click", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, [location.pathname]);

  return null;
}
