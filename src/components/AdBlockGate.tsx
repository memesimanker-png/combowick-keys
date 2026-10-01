import { useCallback, useEffect, useState } from "react";
import { Crown, Loader2, RefreshCw, ShieldOff } from "lucide-react";
import { useAdSettings, type AdPage } from "@/hooks/useAdSettings";
import { useTranslation } from "@/lib/translation-context";
import { detectAdBlock, isBraveBrowser } from "@/lib/adblock";
import { getCpaSubid, cpaTrack } from "@/lib/cpa";

// Full-screen wall on the free-key pages when an ad blocker kills the Monetag ads that pay for
// free keys. Admin toggle: Ad Controls → "Ad-Block Wall" per page (on by default).
export function AdBlockGate({ page }: { page: AdPage }) {
  const { t } = useTranslation();
  const { isAdEnabled, loading } = useAdSettings();
  const enabled = !loading && isAdEnabled(page, "adblock_wall");
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const brave = isBraveBrowser();

  const run = useCallback(async () => {
    setChecking(true);
    const b = await detectAdBlock();
    setBlocked(b);
    setChecking(false);
    return b;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    detectAdBlock().then((b) => {
      if (!alive) return;
      setBlocked(b);
      if (b) cpaTrack(getCpaSubid(), "adblock", { kind: brave ? "brave" : "other" });
    });
    return () => { alive = false; };
  }, [enabled, brave]);

  if (!enabled || !blocked) return null;

  const retry = async () => {
    // Most blockers only release the page after a reload, so re-check first and reload if clean.
    const still = await run();
    if (!still) window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-primary/40 bg-card p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <ShieldOff className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold">{t("Ad blocker detected")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Free keys are paid for by ads. Please turn off your ad blocker for this site, then tap Try again.")}
        </p>

        <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-3 text-left text-xs">
          <p className="mb-1.5 font-semibold text-foreground">{t("How to turn it off:")}</p>
          {brave ? (
            <p className="text-muted-foreground">🦁 {t("Brave: tap the lion icon in the address bar and turn Shields DOWN for this site.")}</p>
          ) : (
            <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
              <li>{t("Ad blocker extension (uBlock, AdBlock, AdGuard): click its icon and pause it on this site.")}</li>
              <li>{t("Brave: tap the lion icon and turn Shields DOWN for this site.")}</li>
              <li>{t("Opera / other browsers: tap the shield icon in the address bar and turn ad blocking off.")}</li>
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={retry}
          disabled={checking}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("Try again")}
        </button>
        <a
          href="/premium-keys"
          data-no-popunder
          className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary/60"
        >
          <Crown className="h-4 w-4 text-primary" /> {t("Get a Premium Key (no ads)")}
        </a>
      </div>
    </div>
  );
}
