import { useEffect } from "react";

/**
 * Monetag popunder loader.
 * The OLD account's popunder (zone 11035708, al5sm.com) was removed so the new
 * Monetag account (verified via the meta tag in index.html) can serve instead.
 * To re-enable, set POPUNDER_ZONE + POPUNDER_SRC to your NEW Monetag values.
 */
const POPUNDER_ZONE = ""; // TODO: new Monetag popunder zone id
const POPUNDER_SRC = "";  // TODO: new Monetag popunder script src

export function usePopunder(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || !POPUNDER_ZONE || !POPUNDER_SRC) return;
    const POPUNDER_ID = `monetag-popunder-${POPUNDER_ZONE}`;
    const load = () => {
      if (document.getElementById(POPUNDER_ID)) return;
      const s = document.createElement("script");
      s.id = POPUNDER_ID;
      s.dataset.zone = POPUNDER_ZONE;
      s.src = POPUNDER_SRC;
      s.async = true;
      document.body.appendChild(s);
    };
    load();
    document.addEventListener("pointerdown", load, { capture: true, once: true });
    return () => document.removeEventListener("pointerdown", load, { capture: true } as any);
  }, [enabled]);
}
