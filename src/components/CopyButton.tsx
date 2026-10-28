import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { canFireDirectLink, maybeFireDirectLink } from "@/lib/monetag";
import { useTranslation } from "@/lib/translation-context";

export function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();
  // Says "(1 ad)" while the next copy will open the sponsor tab (rate-capped, see lib/monetag).
  const [adNext, setAdNext] = useState(canFireDirectLink);

  const handleCopy = async () => {
    // Background-tab Monetag hop (rate-capped to once per 3 min).
    // Fires BEFORE the await so the user gesture isn't lost.
    maybeFireDirectLink();
    setAdNext(false);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.97] ${className}`}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          {t("Copied!")}
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {t("Copy Script")}{adNext && ` (${t("1 ad")})`}
        </>
      )}
    </button>
  );
}
