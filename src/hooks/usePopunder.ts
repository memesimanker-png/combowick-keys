import { useEffect } from "react";

/**
 * Monetag popunder loader.
 * The OLD account's popunder (zone 11035708, al5sm.com) was removed so the new
 * Monetag account (verified via the meta tag in index.html) can serve instead.
 * To re-enable, set POPUNDER_ZONE + POPUNDER_SRC to your NEW Monetag values.
 */
const POPUNDER_ZONE = "11703901"; // Monetag onclick popunder (new account)
const POPUNDER_SRC = "https://al5sm.com/tag.min.js";

export function usePopunder(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || !POPUNDER_ZONE || !POPUNDER_SRC) return;
    const POPUNDER_ID = `monetag-popunder-${POPUNDER_ZONE}`;
    const load = (e?: Event) => {
      if (document.getElementById(POPUNDER_ID)) return;
      // Don't arm the popunder when the user is opting OUT of ads — i.e. clicking a
      // "Skip Ads" control or any link to /premium-keys. They chose to skip, so no
      // popunder should ride along into the premium page. (Return WITHOUT removing the
      // listener so a later, non-skip interaction still arms it.)
      const t = e && (e.target as HTMLElement | null);
      if (t && typeof t.closest === "function" && t.closest('a[href*="/premium-keys"], [data-no-popunder]')) {
        return;
      }
      const s = document.createElement("script");
      s.id = POPUNDER_ID;
      s.dataset.zone = POPUNDER_ZONE;
      s.src = POPUNDER_SRC;
      s.async = true;
      document.body.appendChild(s);
      document.removeEventListener("pointerdown", load, { capture: true } as any);
    };
    // Arm on the first REAL user interaction (not on mount) so a straight-to-Skip-Ads
    // click never loads Monetag at all.
    document.addEventListener("pointerdown", load, { capture: true });
    return () => {
      document.removeEventListener("pointerdown", load, { capture: true } as any);
      const el = document.getElementById(POPUNDER_ID);
      if (el) el.remove();
    };
  }, [enabled]);
}
