import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";

/** Top-of-page "why the steps" note on the Linkvertise verify steps (owner 2026-10-14: users asked "step 3!?"). */
export function WhyStepsNote() {
  const { t } = useTranslation();
  const [steps, setSteps] = useState(3);
  useEffect(() => {
    supabase.from("verify_settings").select("verify_steps").eq("id", 1).maybeSingle()
      .then(({ data }) => { const v = (data as any)?.verify_steps; if (v === 2 || v === 3) setSteps(v); });
  }, []);
  return (
    <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-left">
      <p className="flex items-center gap-2 text-sm font-bold text-amber-300">
        <Heart className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
        {t("Why {n} steps?").replace("{n}", String(steps))}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
        {t("The ads are how we keep COMBO_WICK free. They pay for the servers and new scripts. Thanks for supporting us!")}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("Don't want ads?")}{" "}
        <Link to="/premium-keys" className="font-semibold text-primary underline-offset-2 hover:underline">{t("Get Premium")} →</Link>
      </p>
    </div>
  );
}
