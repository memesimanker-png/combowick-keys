import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, ArrowRight, Check, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";
import { InAppBrowserNotice } from "@/components/InAppBrowserNotice";

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

/** allowOverflow: lets dropdowns (the game picker) spill past the card edge instead of being cut off. */
export function VerifyCard({ children, wide = false, allowOverflow = false }: { children: ReactNode; wide?: boolean; allowOverflow?: boolean }) {
  // free-key pages only: in an app's built-in browser the steps lose progress and look like a bypass (2026-11-10).
  // "Open in Chrome" always goes back to the START, since a half-done step doesn't carry over to another browser.
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  // 2026-11-19: only BEFORE the first Linkvertise pass (provider-select, checkpoint 1). On step 2/3 and the key page
  // its button sent players who were getting through back to the start (wiping step 1); restarts after step 1 rose
  // from 7% to 10% after it shipped. Players who really are stuck still get it on /blocked.
  const keyFlow = path.startsWith("/verify/provider-select") || path.startsWith("/verify/step1");
  const startUrl = typeof window !== "undefined"
    ? (path.startsWith("/verify/provider-select") ? window.location.href : window.location.origin + "/verify/provider-select")
    : "https://keys.combowick.com/verify/provider-select";
  return (
    <div className={`mx-auto w-full ${wide ? "max-w-4xl" : "max-w-3xl"} ${allowOverflow ? "" : "overflow-hidden"} rounded-2xl border border-primary/30 bg-card`}>
      {keyFlow && <InAppBrowserNotice url={startUrl} />}
      {children}
    </div>
  );
}

/** Card header: title + subtitle + progress %, then either a progress bar or the checkpoint tracker. */
export function VerifyHeader({ title, sub, percent, tracker }: { title: string; sub?: string; percent: number; tracker?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-t-2xl border-b border-border/50 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 p-4 sm:px-7 sm:py-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight sm:text-3xl">{title}</h1>
          {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
        </div>
        <div className="shrink-0 text-end">
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
        <KeyRound className="h-4 w-4" /><span className="ms-1 hidden sm:inline">{t("Key")}</span>
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
    // the buyers' own words ("remove the 1 hour wait", "linkvertise sucks"), not ours ("checkpoints")
    ? { title: t("Skip Linkvertise for good"), sub: t("Premium: no ads, no 1-hour wait, key in seconds") }
    : last
      ? { title: t("Next time, skip all this"), sub: t("Premium: no Linkvertise, no 1-hour wait, every game") }
      : { title: t("Tired of Linkvertise?"), sub: t("Premium: no Linkvertise, no 1-hour wait, every game") };
  return (
    <VerifyCard wide>
      <VerifyHeader title={title} sub={sub} percent={Math.round(((n - 1) / steps) * 100)} tracker={<CheckpointTracker steps={steps} current={n} />} />
      <div className="grid items-start gap-4 p-4 sm:grid-cols-[1.35fr_1fr] sm:gap-6 sm:px-7 sm:py-6">
        <div>{video}</div>
        <div>
          <p className="text-sm leading-relaxed text-foreground/85">{text}</p>
          <LinkvertiseGuide />
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
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-extrabold text-primary">{t("Premium")} <ArrowRight className="h-4 w-4 rtl:rotate-180" /></span>
      </span>
    </a>
  );
}

/** 2026-11-17: Linkvertise's page is now a feed with ~20 "Get access" buttons, pushes its own free trial first, and
 *  "Open here" returns in a NEW tab. Half the players who started checkpoint 1 never came back. Three plain lines. */
export function LinkvertiseGuide() {
  const { t } = useTranslation();
  const lines = [
    t('Tap the first "Get access" at the top. That\'s ours.'),
    t('Pick "Watch Ads", not the trial, then tap Skip Ad.'),
    t('Tap "Open here". You continue in a new tab.'),
  ];
  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
      <p className="text-xs font-semibold text-foreground/90">{t("How to get through Linkvertise")}</p>
      <ol className="mt-1.5 space-y-1">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-2 text-xs leading-snug text-foreground/75">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">{i + 1}</span>
            <span>{l}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The tab a player left for Linkvertise: if they come back to it (Back button, switching tabs) after finishing that
 *  checkpoint in the new tab, send it where the new tab went; if they came back without finishing, un-stick the button.
 *  AdReturn writes "cw_lv_done" = {step, next, at}. Returns the function to call right before leaving for Linkvertise. */
export function useLinkvertiseResume(step: "step1" | "step2" | "step3", onBack: () => void) {
  const navigate = useNavigate();
  useEffect(() => {
    const clickKey = "cw_lv_click_" + step;
    const check = () => {
      try {
        const clickAt = Number(localStorage.getItem(clickKey)) || 0;
        const done = JSON.parse(localStorage.getItem("cw_lv_done") || "null");
        if (clickAt && done && done.step === step && done.at > clickAt && Date.now() - done.at < 15 * 60 * 1000 && typeof done.next === "string") {
          localStorage.removeItem(clickKey);
          navigate(done.next, { replace: true });
          return true;
        }
      } catch {
        /* storage blocked: nothing to resume */
      }
      return false;
    };
    const onShow = (e: PageTransitionEvent) => {
      if (!check() && e.persisted) onBack();
    };
    const onVis = () => {
      if (document.visibilityState === "visible" && !check()) onBack();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cw_lv_done") check();
    };
    window.addEventListener("pageshow", onShow);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("storage", onStorage);
    check();
    return () => {
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  return () => {
    try {
      localStorage.setItem("cw_lv_click_" + step, String(Date.now()));
    } catch {
      /* ignore */
    }
  };
}
