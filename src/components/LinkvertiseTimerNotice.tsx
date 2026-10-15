import { Clock, ExternalLink, HeartHandshake } from "lucide-react";
import { useTranslation } from "@/lib/translation-context";

/**
 * Shown on every Linkvertise step, right above the button:
 * 1) a please-don't-skip ask (no telling users to click/install ads — networks treat that as incentivized traffic),
 * 2) the disclaimer that Linkvertise's wait timer is theirs, not ours (cuts support tickets).
 */
export function LinkvertiseTimerNotice() {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      {/* Big, high-contrast on purpose: kids press Skip (owner 2026-10-13). Trimmed 2026-10-14: no click/install asks. */}
      <div className="rounded-xl border-2 border-red-500 bg-red-950/60 p-4 shadow-[0_0_24px_rgba(239,68,68,0.35)]">
        <p className="text-base font-extrabold uppercase tracking-wide text-red-400 sm:text-lg">⛔ {t("Don't press Skip Ad")}</p>
        <p className="mt-3 text-sm font-medium text-white">✅ {t("Let each step finish on its own.")}</p>
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-red-200">
          <HeartHandshake className="h-4 w-4 shrink-0" />
          {t("Finishing the steps keeps keys free for everyone. Thank you!")}
        </p>
      </div>
      <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed">
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              {t("Heads up — the wait timer is set by Linkvertise, not us.")}
            </p>
            <p className="text-muted-foreground">
              {t("Linkvertise (the ad service) controls the countdown on each step. We can't shorten or remove it. If you want to skip ads entirely, grab a")}{" "}
              <a href="/premium-keys" className="text-primary underline-offset-2 hover:underline inline-flex items-center gap-0.5">
                {t("Premium Key")} <ExternalLink className="h-3 w-3" />
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
