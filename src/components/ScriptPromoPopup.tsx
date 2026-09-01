import { useEffect, useMemo, useState } from "react";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useFeaturedScripts } from "@/hooks/useScripts";
import { GameThumbnail } from "@/components/GameThumbnail";

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = "script_promo_closed";

interface ScriptPromoPopupProps {
  enabled?: boolean;
  delayMs?: number;
}

/**
 * A dismissible promo modal that spotlights one of the hub's featured
 * scripts. Shown on the key pages to cross-promote free scripts.
 * Toggle it per-page from the Admin ad settings matrix (script_promo).
 */
export default function ScriptPromoPopup({ enabled = true, delayMs = 2500 }: ScriptPromoPopupProps) {
  const { data: scripts = [] } = useFeaturedScripts(8);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  const promo = useMemo(() => {
    const free = scripts.filter((s: any) => !s.is_paid);
    const pool = free.length ? free : scripts;
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [scripts]);

  useEffect(() => {
    if (!enabled || !promo) return;
    try {
      const last = localStorage.getItem(STORAGE_KEY);
      if (last && Date.now() - parseInt(last) < COOLDOWN_MS) return;
    } catch {}
    const t = setTimeout(() => {
      setVisible(true);
      setAnimating(true);
    }, delayMs);
    return () => clearTimeout(t);
  }, [enabled, promo, delayMs]);

  const close = () => {
    setAnimating(false);
    try { localStorage.setItem(STORAGE_KEY, Date.now().toString()); } catch {}
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible || !promo) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300 ${
        animating ? "opacity-100" : "opacity-0"
      }`}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className={`relative w-full max-w-md rounded-2xl border border-primary/30 bg-card shadow-2xl transition-all duration-300 ${
          animating ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <button
          onClick={close}
          className="absolute top-3 right-3 z-10 rounded-full bg-secondary/80 p-2 hover:bg-secondary transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          <div className="flex items-center gap-2 text-primary mb-4">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Featured Script</span>
          </div>

          <div className="flex gap-4 items-center">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border">
              <GameThumbnail
                gameName={promo.game}
                universeId={promo.game_universe_id}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading text-lg font-bold truncate">{promo.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{promo.description}</p>
            </div>
          </div>

          <Link
            to={`/scripts/${promo.slug}`}
            onClick={close}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get This Script <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Unlocked with your free key
          </p>
        </div>
      </div>
    </div>
  );
}
