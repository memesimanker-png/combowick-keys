import { Link } from "react-router-dom";
import { Shield, Crown, Key, Code2 } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/lib/translation-context";

/**
 * Shared header for the key/verify funnel pages. Gives users real navigation
 * (clickable brand + Get Key / Premium) so they're never stranded — especially
 * on mobile, where the sticky bottom bar is hidden on these pages.
 */
export function FunnelHeader({ title }: { title?: string }) {
  const { t } = useTranslation();
  return (
    <header className="border-b border-border/40 bg-black/40 backdrop-blur-md">
      <div className="container flex items-center justify-between gap-2 py-4">
        <Link to="/premium-keys" className="flex items-center gap-2 min-w-0">
          <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
          <span className="text-base sm:text-lg font-bold truncate">{title || "ComboWick"}</span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link
            to="/keys"
            aria-label={t("Get Key")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <Key className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("Get Key")}</span>
          </Link>
          <a
            href="http://combowick.com/scripts"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("Get Script")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <Code2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("Get Script")}</span>
          </a>
          <Link
            to="/premium-keys"
            aria-label={t("Premium")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <Crown className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("Premium")}</span>
          </Link>
          <LanguageSelector compact />
        </div>
      </div>
    </header>
  );
}
