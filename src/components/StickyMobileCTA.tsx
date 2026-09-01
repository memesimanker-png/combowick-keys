import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Crown, Key, Sparkles } from "lucide-react";

/**
 * Sticky mobile bottom-bar CTA. Mobile-only (md:hidden), hidden on
 * verification/checkout/admin flows where it would interfere.
 */
const HIDE_ON = ["/verify", "/ad-return", "/admin", "/login", "/signup", "/blocked", "/access-key", "/claim-access"];

export function StickyMobileCTA() {
  const { pathname } = useLocation();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Reveal after slight scroll so it doesn't fight with the hero CTA on first paint.
    const onScroll = () => setShown(window.scrollY > 240);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <div
      className={`md:hidden fixed bottom-3 left-3 right-3 z-40 transition-all duration-300 ${
        shown ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
      }`}
      role="region"
      aria-label="Quick actions"
    >
      <div className="flex gap-2 p-2 rounded-2xl bg-background/85 backdrop-blur-xl border border-border shadow-lg">
        <Link
          to="/scripts"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold active:scale-95 transition"
        >
          <Sparkles className="h-3.5 w-3.5" /> Scripts
        </Link>
        <Link
          to="/premium-keys"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent/90 text-accent-foreground text-xs font-semibold active:scale-95 transition"
        >
          <Key className="h-3.5 w-3.5" /> Keys
        </Link>
        <Link
          to="/premium-keys"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-secondary text-secondary-foreground border border-border text-xs font-semibold active:scale-95 transition"
        >
          <Crown className="h-3.5 w-3.5" /> Premium
        </Link>
      </div>
    </div>
  );
}
