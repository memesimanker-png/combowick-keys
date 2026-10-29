import { useEffect, useState, type ReactNode } from "react";
import { Crown, ArrowRight, Check, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";

/**
 * Shared pieces of the free-key funnel redesign (owner 2026-10-29, mockups/keypage-v3*.html):
 * one gold card with a header (title, subtitle, progress), a checkpoint tracker, and ONE glowing
 * Premium bar per page.
 */

const STEPS_CACHE = "cw_verify_steps";

/** 2 or 3 Linkvertise checkpoints (admin setting verify_settings.verify_steps). */
export function useVerifySteps(): number {
  const [steps, setSteps] = useState<number>(() => {
    try { const v = Number(sessionStorage.getItem(STEPS_CACHE)); return v === 2 || v === 3 ? v : 3; } catch { return 3; }
  });
  useEffect(() => {
    let alive = true;
    supabase.from("verify_settings").select("verify_steps").eq("id", 1).maybeSingle().then(({ data }) => {
      const v = (data as { verify_steps?: number } | null)?.verify_steps;
      if (!alive || (v !== 2 && v !== 3)) return;
      setSteps(v);
      try { sessionStorage.setItem(STEPS_CACHE, String(v)); } catch { /* ignore */ }
    });
    return () => { alive = false; };
  }, []);
  return steps;
}

export function VerifyCard({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto w-full ${wide ? "max-w-4xl" : "max-w-3xl"} overflow-hidden rounded-2xl border border-primary/30 bg-card`}>
      {children}
    </div>
  );
}

/** Card header: title + subtitle + progress %, then either a progress bar or the checkpoint tracker. */
export function VerifyHeader({ title, sub, percent, tracker }: { title: string; sub?: string; percent: number; tracker?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="border-b border-border/50 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 p-4 sm:px-7 sm:py-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight sm:text-3xl">{title}</h1>
          {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-muted-foreground sm:text-xs">{t("Progress")}</p>
          <p className="text-lg font-bold text-primary sm:text-2xl">{percent}%</p>
        </div>
      </div>
      {tracker ?? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary sm:mt-4">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}

/** Checkpoint 1 · 2 · 3 · Key. `current` = 1-based checkpoint now; current > steps means all done (key page). */
export function CheckpointTracker({ steps, current, keyDone = false }: { steps: number; current: number; keyDone?: boolean }) {
  const { t } = useTranslation();
  const base = "flex h-8 flex-1 items-center justify-center rounded-lg border text-xs font-semibold sm:h-9 sm:text-[13px]";
  const done = "border-green-500/40 bg-green-500/15 text-green-300";
  const now = "border-primary bg-primary text-primary-foreground font-extrabold";
  const todo = "border-border bg-secondary text-muted-foreground";
  return (
    <div className="mt-3 flex gap-1.5 sm:mt-4 sm:gap-2">
      {Array.from({ length: steps }, (_, i) => i + 1).map((n) => (
        <span key={n} className={`${base} ${n < current ? done : n === current ? now : todo}`}>
          {n < current ? <Check className="h-4 w-4" /> : <><span className="hidden sm:inline">{t("Checkpoint")}&nbsp;</span>{n}</>}
        </span>
      ))}
      <span className={`${base} ${keyDone ? done : current > steps ? now : todo} sm:flex-[0.8]`}>
        <KeyRound className="h-4 w-4" /><span className="ml-1 hidden sm:inline">{t("Key")}</span>
      </span>
    </div>
  );
}

/**
 * One checkpoint page (1..steps): header with tracker, then video | (what happens next, button, Premium bar).
 * Each page keeps its own logic (guards, popunder, Linkvertise hop); this is only the look.
 */
export function CheckpointLayout({ n, steps, video, button }: { n: number; steps: number; video: ReactNode; button: ReactNode }) {
  const { t } = useTranslation();
  const last = n >= steps;
  const left = steps - n + 1;
  const title = last ? t("Last Checkpoint") : t("Checkpoint {n} of {total}").replace("{n}", String(n)).replace("{total}", String(steps));
  const sub = n === 1 ? t("Free key") : last ? t("Your key is right after this.") : t("Checkpoint {n} done. Nice.").replace("{n}", String(n - 1));
  const text = n === 1
    ? t("Watch a few seconds, then tap the button. You'll do one short Linkvertise page and come right back here.")
    : last
      ? t("One more Linkvertise page and you'll pick your game and get your key.")
      : t("Same as before: one Linkvertise page, then back here. {n} to go.").replace("{n}", String(left));
  const premium = n === 1
    ? { title: t("Skip every checkpoint"), sub: t("Premium: no ads, key in seconds") }
    : last
      ? { title: t("Next time, skip all this"), sub: t("Premium: one key, every game") }
      : { title: t("Tired of checkpoints?"), sub: t("Premium skips all of them") };
  return (
    <VerifyCard wide>
      <VerifyHeader title={title} sub={sub} percent={Math.round(((n - 1) / steps) * 100)} tracker={<CheckpointTracker steps={steps} current={n} />} />
      <div className="grid items-start gap-4 p-4 sm:grid-cols-[1.35fr_1fr] sm:gap-6 sm:px-7 sm:py-6">
        <div>{video}</div>
        <div>
          <p className="text-sm leading-relaxed text-foreground/85">{text}</p>
          <div className="mt-4">{button}</div>
          <PremiumGlowBar title={premium.title} sub={premium.sub} />
          <p className="mt-3 text-xs text-muted-foreground">{t("Heads up — the wait timer is set by Linkvertise, not us.")}</p>
        </div>
      </div>
    </VerifyCard>
  );
}

/** The one Premium nudge per page: full-width, animated gold edge (.cw-glow in index.css). */
export function PremiumGlowBar({ title, sub }: { title: string; sub: string }) {
  const { t } = useTranslation();
  return (
    <a href="/premium-keys" data-no-popunder className="cw-glow mt-3 block" style={{ ["--glow-fill" as string]: "30 8% 10%", ["--glow-radius" as string]: "11px" }}>
      <span className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2.5">
        <span className="min-w-0 text-sm font-medium leading-snug text-foreground">
          <span className="flex items-center gap-1.5"><Crown className="h-4 w-4 shrink-0 text-primary" />{title}</span>
          <span className="block text-xs font-normal text-muted-foreground">{sub}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-extrabold text-primary">{t("Premium")} <ArrowRight className="h-4 w-4" /></span>
      </span>
    </a>
  );
}
