import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Crown, Key, Code2 } from "lucide-react";
import { useTranslation } from "@/lib/translation-context";

/**
 * Sticky mobile bottom-bar CTA. Mobile-only (md:hidden), hidden on
 * verification/checkout/admin flows where it would interfere.
 */
const HIDE_ON = ["/verify", "/ad-return", "/admin", "/login", "/signup", "/blocked", "/access-key", "/claim-access"];

export function StickyMobileCTA() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Reveal after slight scroll so it doesn't fight with the hero CTA on first paint.
    const onScroll = () => setShown(window.scrollY > 240);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  const onKeys = pathname.startsWith("/keys");
  const onPremium = pathname.startsWith("/premium");

  return (
    <div
      className={`md:hidden fixed bottom-3 left-3 right-3 z-50 transition-all duration-300 ${
        shown ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
      }`}
      role="region"
      aria-label="Quick actions"
    >
      <div className="flex gap-2 p-2 rounded-2xl bg-background/90 backdrop-blur-xl border border-border shadow-lg">
        {/* Free key flow — dimmed when already there */}
        <Link
          to="/keys"
          aria-disabled={onKeys}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold active:scale-95 transition ${
            onKeys ? "bg-secondary text-muted-foreground pointer-events-none opacity-60" : "bg-primary text-primary-foreground"
          }`}
        >
          <Key className="h-3.5 w-3.5" /> {t("Get Key")}
        </Link>
        {/* Premium store — dimmed when already there */}
        <Link
          to="/premium-keys"
          aria-disabled={onPremium}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold active:scale-95 transition ${
            onPremium ? "bg-secondary text-muted-foreground pointer-events-none opacity-60" : "bg-accent/90 text-accent-foreground"
          }`}
        >
          <Crown className="h-3.5 w-3.5" /> {t("Premium")}
        </Link>
        {/* Get the script (external) */}
        <a
          href="http://combowick.com/scripts"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-secondary text-secondary-foreground border border-border text-xs font-semibold active:scale-95 transition"
        >
          <Code2 className="h-3.5 w-3.5" /> {t("Get Script")}
        </a>
      </div>
    </div>
  );
}
