import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";

/**
 * The one notice on every Linkvertise step, right above the button (owner 2026-10-15: merged the
 * separate "Why N steps?", "Why Verification?" and timer boxes — the page looked packed).
 * No "don't press Skip Ad" ask: Linkvertise support confirmed (2026-10-15) skipping is part of the
 * normal ad flow and still earns. Never tell users to click/install ads (incentivized traffic).
 */
export function LinkvertiseTimerNotice() {
  const { t } = useTranslation();
  const [steps, setSteps] = useState(3);
  useEffect(() => {
    supabase.from("verify_settings").select("verify_steps").eq("id", 1).maybeSingle()
      .then(({ data }) => { const v = (data as any)?.verify_steps; if (v === 2 || v === 3) setSteps(v); });
  }, []);
  return (
    <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-left">
      <p className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
        <Heart className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
        {t("Why {n} steps?").replace("{n}", String(steps))}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-foreground/90">
        {t("The ads are how we keep COMBO_WICK free. They pay for the servers and new scripts. Thanks for supporting us!")}
      </p>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p className="flex items-start gap-1.5">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t("Heads up — the wait timer is set by Linkvertise, not us.")}
        </p>
        <p>
          {t("Don't want ads?")}{" "}
          <Link to="/premium-keys" className="font-semibold text-primary underline-offset-2 hover:underline">{t("Get Premium")} →</Link>
        </p>
      </div>
    </div>
  );
}
