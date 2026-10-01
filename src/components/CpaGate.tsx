import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";
import { CpaOfferWall } from "@/components/CpaOfferWall";
import { getCpaSubid, useCpaOffers } from "@/lib/cpa";

/**
 * The CPALead offer wall for flows outside the free-key page (script unlock, key extension).
 * Loads the same admin switches as the key page (verify_settings.cpa_enabled / linkvertise_enabled):
 *  - offers for this visitor  -> offer wall (main offers first, Alternate offers below)
 *  - Linkvertise on: only thin countries (<=1 main offer / Alternate offers known empty) get a
 *    Linkvertise option; with nothing at all to show it goes straight to the flow's Linkvertise path
 *  - no offers + Linkvertise off -> VPN notice, or Alternate offers only
 * `onConfirm` runs once a real CPALead postback exists for this visitor (server re-checks it).
 */
export function CpaGate({ onConfirm, onDone, doneTitle, doneText, lvFallback }: {
  onConfirm: (subid: string) => Promise<boolean>;
  onDone: () => void;
  doneTitle?: string;
  doneText?: string;
  lvFallback?: () => void;
}) {
  const { t } = useTranslation();
  const [cpaEnabled, setCpaEnabled] = useState<boolean | null>(null);
  const [lvEnabled, setLvEnabled] = useState(true);
  const subid = useMemo(getCpaSubid, []);

  useEffect(() => {
    supabase.from("verify_settings").select("cpa_enabled, linkvertise_enabled").eq("id", 1).maybeSingle()
      .then(({ data }) => {
        const d = data as any;
        setCpaEnabled(d?.cpa_enabled !== false);
        setLvEnabled(d?.linkvertise_enabled !== false);
      }, () => setCpaEnabled(true));
  }, []);

  const cpa = useCpaOffers(cpaEnabled);
  const canUseLv = lvEnabled && !!lvFallback;

  // Nothing at all left (VPN, or no main offers + Alternate offers known empty) and Linkvertise
  // allowed -> straight to the flow's Linkvertise path. Otherwise Linkvertise is just an option.
  const lvOnly = cpa.status === "none" && canUseLv && (cpa.blocked === "vpn" || cpa.lockerOk === false);
  useEffect(() => {
    if (lvOnly) lvFallback!();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lvOnly]);
  const thinCountry = cpa.offers.length <= 1 || cpa.lockerOk === false;

  if (cpaEnabled === null || cpa.status === "loading" || lvOnly) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-primary">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("Loading...")}
      </div>
    );
  }

  if (cpa.status === "none" && cpa.blocked === "vpn") {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-5 text-center">
        <p className="font-semibold">{t("VPN or proxy detected")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("Offers don't work through a VPN. Turn it off, then tap Try again.")}</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
          {t("Try again")}
        </button>
      </div>
    );
  }

  return (
    <CpaOfferWall
      offers={cpa.status === "ready" ? cpa.offers : []}
      alternateOnly={cpa.status !== "ready"}
      subid={subid}
      country={cpa.country}
      lockerOk={cpa.lockerOk}
      linkvertiseOption={canUseLv && thinCountry ? () => lvFallback?.() : undefined}
      showHours={false}
      allowLinkvertise={canUseLv && thinCountry}
      onStuckFallback={() => lvFallback?.()}
      onConfirm={onConfirm}
      onDone={onDone}
      doneTitle={doneTitle}
      doneText={doneText}
    />
  );
}
