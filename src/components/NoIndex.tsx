import { useEffect } from "react";

export function NoIndex() {
  useEffect(() => {
    const crawlableGatePaths = ["/verify", "/ad-return", "/access-key", "/claim-access", "/blocked", "/register"];
    if (crawlableGatePaths.some((path) => window.location.pathname.startsWith(path))) return;

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
