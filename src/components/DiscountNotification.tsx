import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useDragControls, useMotionValue } from "framer-motion";
import { Sparkles, X, ArrowRight, GripVertical, Minus, Clock, Tag } from "lucide-react";
import { useKeyDiscounts } from "@/hooks/useKeyDiscounts";
import { useTranslation } from "@/lib/translation-context";

// Map discount tier ids to the same name keys the pricing cards use, so the
// notification says exactly which package is on sale (translated).
const TIER_NAMES: Record<string, string> = {
  monthly: "Monthly Access",
  lifetime: "Lifetime Key",
  "trial-7day": "7-Day Trial",
};

const POS_KEY = "cw-discount-pos";
const SIZE_KEY = "cw-discount-size";
const COLLAPSE_KEY = "cw-discount-collapsed";

function readJSON<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}

// ms until the next UTC midnight — when the day-based auto discount recalculates.
function msUntilUtcMidnight(): number {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
  return Math.max(0, next - now.getTime());
}
function fmtCountdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(sec)}`;
}

/**
 * A neat, draggable + resizable popup that announces whichever key discount is
 * currently live — fully translated. Users can move it, resize it, or minimize
 * it to a small pill; position/size/collapsed state persist across sessions.
 * Shows the single biggest active discount and only once per browser session.
 */
export function DiscountNotification() {
  const { data: discounts } = useKeyDiscounts();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => readJSON<boolean>(COLLAPSE_KEY) ?? false);
  const [remaining, setRemaining] = useState<number>(msUntilUtcMidnight);

  const constraintsRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);
  const dragControls = useDragControls();

  // A drag should never also fire a click. onDragStart marks the gesture; the
  // click that concludes the same gesture is suppressed, and the flag clears on
  // the next tick so later, independent clicks work normally.
  const startDrag = (e: React.PointerEvent) => dragControls.start(e);
  const guard = (fn: () => void) => () => { if (!didDragRef.current) fn(); };

  // Restore saved position (clamped so the card can't start off-screen).
  const saved = readJSON<{ x: number; y: number }>(POS_KEY);
  const clampedX = saved ? Math.min(Math.max(saved.x, 0), Math.max(0, window.innerWidth - 300)) : 0;
  const clampedY = saved ? Math.min(Math.max(saved.y, -(window.innerHeight - 220)), 0) : 0;
  const x = useMotionValue(clampedX);
  const y = useMotionValue(clampedY);

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
    try { if (sessionStorage.getItem(seenKey)) return; } catch { /* ignore */ }
    const timer = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(timer);
  }, [best, seenKey]);

  // Live countdown tick.
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setRemaining(msUntilUtcMidnight()), 1000);
    return () => clearInterval(id);
  }, [visible]);

  // Restore saved size + persist future resizes (native CSS resize on the card).
  useEffect(() => {
    if (!visible || collapsed) return;
    const el = cardRef.current;
    if (!el) return;
    const sz = readJSON<{ w: number; h: number }>(SIZE_KEY);
    if (sz) { el.style.width = `${sz.w}px`; el.style.height = `${sz.h}px`; }
    const ro = new ResizeObserver(() => {
      try { localStorage.setItem(SIZE_KEY, JSON.stringify({ w: el.offsetWidth, h: el.offsetHeight })); } catch { /* ignore */ }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [visible, collapsed]);

  if (!best || dismissed) return null;

  const persistPos = () => {
    try { localStorage.setItem(POS_KEY, JSON.stringify({ x: x.get(), y: y.get() })); } catch { /* ignore */ }
  };
  const toggleCollapse = () => {
    setCollapsed((c) => { const n = !c; try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(n)); } catch {} return n; });
  };
  const close = () => {
    setVisible(false);
    setDismissed(true);
    try { if (seenKey) sessionStorage.setItem(seenKey, "1"); } catch { /* ignore */ }
  };
  const viewDeal = () => {
    const cards = document.querySelector("[data-pricing-cards]");
    if (cards) cards.scrollIntoView({ behavior: "smooth", block: "start" });
    else navigate("/premium-keys");
    close();
  };

  const name = t(TIER_NAMES[best.tier] || best.tier);
  const headline = t("{name} is now {percent}% OFF")
    .replace("{name}", name)
    .replace("{percent}", String(best.percent));
  const badge = best.label ? t(best.label) : t("Limited-Time Deal");

  return (
    <div ref={constraintsRef} className="pointer-events-none fixed inset-0 z-40">
      <AnimatePresence>
        {visible && (
          <motion.div
            drag
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={constraintsRef}
            dragMomentum={false}
            onDragStart={() => { didDragRef.current = true; }}
            onDragEnd={() => { persistPos(); setTimeout(() => { didDragRef.current = false; }, 0); }}
            style={{ x, y }}
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="pointer-events-auto absolute bottom-3 left-3 w-fit sm:left-4"
            role="status"
            aria-live="polite"
          >
            {collapsed ? (
              // Minimized pill
              <button
                onClick={guard(toggleCollapse)}
                onPointerDown={startDrag}
                aria-label={t("View Deal")}
                className="group flex cursor-grab items-center gap-2 rounded-full border border-green-500/50 bg-gradient-to-br from-green-950/95 to-black/95 py-2 pl-3 pr-4 shadow-2xl shadow-green-900/40 backdrop-blur active:cursor-grabbing"
              >
                <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                  <Tag className="h-3.5 w-3.5 text-green-300" />
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400/40" />
                </span>
                <span className="text-sm font-extrabold text-green-400">-{best.percent}%</span>
                <span className="text-xs font-medium text-white/80">{name}</span>
              </button>
            ) : (
              <div
                ref={cardRef}
                className="relative flex min-h-[9rem] min-w-[16rem] w-[calc(100vw-1.5rem)] max-w-[95vw] sm:w-80 resize flex-col overflow-hidden rounded-2xl border border-green-500/40 bg-gradient-to-br from-green-950/95 via-black/95 to-black/95 p-4 shadow-2xl shadow-green-900/40 backdrop-blur"
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-green-500/20 blur-2xl" />

                {/* Header / drag handle */}
                <div
                  onPointerDown={startDrag}
                  className="mb-2 flex cursor-grab items-center gap-2 active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-white/30" />
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-500/40 bg-green-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-green-300">
                    <Sparkles className="h-3 w-3" />
                    {badge}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={guard(toggleCollapse)} aria-label={t("Close")} className="rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-white/10 hover:text-white">
                      <Minus className="h-4 w-4" />
                    </button>
                    <button onClick={guard(close)} aria-label={t("Close")} className="rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-white/10 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold leading-none text-green-400">-{best.percent}%</span>
                  <span className="text-sm font-semibold text-white">{name}</span>
                </div>

                <p className="mt-1 text-sm font-medium text-white/90">{headline}</p>

                {/* Live countdown */}
                <div className="mt-2 flex items-center gap-1.5 text-xs text-green-300/90">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t("Today's deal ends in")}</span>
                  <span className="font-mono font-bold tabular-nums text-green-300">{fmtCountdown(remaining)}</span>
                </div>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("Grab your discounted key before the deal ends!")}
                </p>

                <button
                  onClick={guard(viewDeal)}
                  className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 pt-2 text-sm font-semibold text-white transition-colors hover:bg-green-500"
                >
                  {t("View Deal")}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
