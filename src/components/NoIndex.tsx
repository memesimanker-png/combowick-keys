import { useEffect } from "react";

export function NoIndex() {
  useEffect(() => {
    // 2026-11-19: only the free-key landing stays indexable (people search for the key page). Checkpoints, the
    // return links, the "Security Warning" page and the key page itself were indexable (left over from AdSense review).
    if (window.location.pathname === "/verify/provider-select") return;

    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    meta.setAttribute("data-noindex-gate", "true");
    document.head.appendChild(meta);
    return () => {
      document.querySelectorAll('meta[data-noindex-gate="true"]').forEach((el) => el.remove());
    };
  }, []);
  return null;
}
