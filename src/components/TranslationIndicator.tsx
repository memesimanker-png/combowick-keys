import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useTranslation, OUTAGE_MESSAGES } from "@/lib/translation-context";

/**
 * Floating bottom-left chip that shows live translation status.
 * - Spinner while AI translation is in flight
 * - Outage banner (in the user's language) when all AI sources are exhausted
 * - 6s success toast once done
 */
export default function TranslationIndicator() {
  const { isTranslating, currentLanguage, translationOutage } = useTranslation();
  const [showDone, setShowDone] = useState(false);
  const [wasTranslating, setWasTranslating] = useState(false);

  useEffect(() => {
    if (isTranslating) {
      setWasTranslating(true);
      setShowDone(false);
    } else if (wasTranslating) {
      setShowDone(true);
      const t = setTimeout(() => setShowDone(false), 6000);
      return () => clearTimeout(t);
    }
  }, [isTranslating, wasTranslating]);

  if (currentLanguage === "en") return null;

  // Outage takes priority — keep it visible until translation recovers.
  if (translationOutage && !isTranslating) {
    const msg = OUTAGE_MESSAGES[currentLanguage] || OUTAGE_MESSAGES.en;
    return (
      <div
        data-no-translate
        className="fixed bottom-4 left-4 z-[9999] max-w-[90vw]"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-background/95 px-4 py-2 text-sm text-foreground shadow-lg backdrop-blur">
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <span>{msg}</span>
        </div>
      </div>
    );
  }

  if (!isTranslating && !showDone) return null;

  return (
    <div
      data-no-translate
      className="fixed bottom-4 left-4 z-[9999] pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {isTranslating ? (
        <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-background/95 px-4 py-2 text-sm text-foreground shadow-lg backdrop-blur">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Translating page…</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-background/95 px-4 py-2 text-sm text-foreground shadow-lg backdrop-blur">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Page translated.</span>
        </div>
      )}
    </div>
  );
}
