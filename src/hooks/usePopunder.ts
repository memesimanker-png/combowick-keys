import { useEffect } from "react";

/**
 * Loads the Monetag popunder tag (zone 11035708) on the current page.
 * The tag is injected once per mount; Monetag controls the actual firing
 * cadence and frequency cap on their end (typically fires on a real user
 * click). Loading it again on revisit is a no-op if it's already present.
 */
export function usePopunder(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    const POPUNDER_ID = "monetag-popunder-11035708";
    const load = () => {
      if (document.getElementById(POPUNDER_ID)) return;
      const s = document.createElement("script");
      s.id = POPUNDER_ID;
      s.dataset.zone = "11035708";
      s.src = "https://al5sm.com/tag.min.js";
      s.async = true;
      document.body.appendChild(s);
    };
    load();
    document.addEventListener("pointerdown", load, { capture: true, once: true });
    return () => document.removeEventListener("pointerdown", load, { capture: true } as any);
  }, [enabled]);
}
