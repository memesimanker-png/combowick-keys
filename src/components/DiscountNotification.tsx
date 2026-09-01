import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { useKeyDiscounts } from "@/hooks/useKeyDiscounts";
import { useTranslation } from "@/lib/translation-context";

// Map discount tier ids to the same name keys the pricing cards use, so the
// notification says exactly which package is on sale (translated).
const TIER_NAMES: Record<string, string> = {
  monthly: "Monthly Access",
  lifetime: "Lifetime Key",
  "trial-7day": "7-Day Trial",
};

/**
 * A neat, self-dismissing popup that announces whichever key discount is
 * currently live on the premium page — fully translated into the selected
 * language. Shows the single biggest active discount so it never spams, and
 * only once per browser session per deal.
 */
export function DiscountNotification() {
  const { data: discounts } = useKeyDiscounts();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Pick the single best (highest %) active discount to feature.
  const best = useMemo(() => {
    if (!discounts) return null;
    let top: { tier: string; percent: number; label: string | null } | null = null;
    for (const [tier, d] of discounts.entries()) {
      if (d.active && d.percent_off > 0 && (!top || d.percent_off > top.percent)) {
        top = { tier, percent: d.percent_off, label: d.label };
      }
    }
    return top;
  }, [discounts]);

  const seenKey = best ? `cw-discount-seen-${best.tier}-${best.percent}` : null;

  useEffect(() => {
    if (!best || !seenKey) return;
    try {
      if (sessionStorage.getItem(seenKey)) return;
    } catch { /* ignore */ }
    const timer = setTimeout(() => setVisible(true), 1200); // gentle entrance
    return () => clearTimeout(timer);
  }, [best, seenKey]);

  if (!best || dismissed) return null;

  const close = () => {
    setVisible(false);
    setDismissed(true);
    try { if (seenKey) sessionStorage.setItem(seenKey, "1"); } catch { /* ignore */ }
  };

  const name = t(TIER_NAMES[best.tier] || best.tier);
  const headline = t("{name} is now {percent}% OFF")
    .replace("{name}", name)
    .replace("{percent}", String(best.percent));
  const badge = best.label ? t(best.label) : t("Limited-Time Deal");

  const scrollToPricing = () => {
    const cards = document.querySelector("[data-pricing-cards]");
    if (cards) cards.scrollIntoView({ behavior: "smooth", block: "start" });
    close();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="fixed bottom-4 right-4 z-50 w-[min(92vw,22rem)]"
          role="status"
          aria-live="polite"
        >
          <div className="relative overflow-hidden rounded-2xl border border-green-500/40 bg-gradient-to-br from-green-950/95 via-black/95 to-black/95 p-4 shadow-2xl shadow-green-900/40 backdrop-blur">
            {/* glow accent */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-green-500/20 blur-2xl" />

            <button
              onClick={close}
              aria-label={t("Close")}
              className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 pr-6">
              <span className="inline-flex items-center gap-1 rounded-full border border-green-500/40 bg-green-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-green-300">
                <Sparkles className="h-3 w-3" />
                {badge}
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold leading-none text-green-400">
                -{best.percent}%
              </span>
              <span className="text-sm font-semibold text-white">{name}</span>
            </div>

            <p className="mt-1 text-sm font-medium text-white/90">{headline}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("Grab your discounted key before the deal ends!")}
            </p>

            <button
              onClick={scrollToPricing}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500"
            >
              {t("View Deal")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
