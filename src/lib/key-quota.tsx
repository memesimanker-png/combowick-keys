import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";

// Free keys are limited per IP (generate-hwid-key: 5 per 10 hours). The key page used to find out only
// at the very end — after the visitor had already done the offer / Linkvertise. Ask up front instead.
export type KeyQuota = { limited: boolean; used: number; limit: number; resets_at: string | null };

export async function fetchKeyQuota(): Promise<KeyQuota | null> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-hwid-key", { body: { check_quota: true } });
    if (error || !data?.success) return null; // unknown -> never block anyone
    return data as KeyQuota;
  } catch {
    return null;
  }
}

export function useKeyQuota(enabled = true) {
  const [quota, setQuota] = useState<KeyQuota | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchKeyQuota().then((q) => { if (alive) setQuota(q); });
    return () => { alive = false; };
  }, [enabled]);
  return quota;
}

/** "3 h 20 min" until the next free key (rounded up to the minute). */
export function waitLabel(resetsAt: string | null | undefined): string {
  const ms = resetsAt ? new Date(resetsAt).getTime() - Date.now() : 0;
  const mins = Math.max(1, Math.ceil(ms / 60000));
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export function KeyLimitNotice({ resetsAt, limit = 5 }: { resetsAt: string | null | undefined; limit?: number }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-5 text-center">
      <Clock className="mx-auto mb-2 h-8 w-8 text-amber-400" />
      <p className="font-semibold">{t("You've reached the free key limit")}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("You can get {n} free keys every 10 hours. Your next free key is available in {time}.")
          .replace("{n}", String(limit))
          .replace("{time}", waitLabel(resetsAt))}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{t("Your last key still works until it expires.")}</p>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {t("Want to skip the tasks entirely?")} <a href="/premium-keys" className="text-primary underline">{t("Premium Keys")}</a>.
      </p>
    </div>
  );
}
