import { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/lib/translation-context";
import { LANGUAGES, LangCode } from "@/lib/translations";
import { Globe, ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LanguageSelectorProps {
  dropUp?: boolean;
  inline?: boolean;
}

export function LanguageSelector({ dropUp = false, inline = false }: LanguageSelectorProps) {
  const { currentLanguage, setLanguage, isTranslating } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === currentLanguage) || LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const dropdownPosition = dropUp
    ? "bottom-full mb-2"
    : "top-full mt-2";

  return (
    <div className="relative" ref={ref} data-no-translate>
      <div className="relative rounded-lg lang-glow-wrap">
        <span aria-hidden className="lang-glow-ring" />
        <button
          onClick={() => setOpen(!open)}
          className="relative z-[2] flex items-center gap-2 px-3 py-2 rounded-[7px] text-sm font-medium text-muted-foreground hover:text-foreground bg-transparent transition-all"
        >
          <Globe className="h-4 w-4 text-primary" />
          <span>{current.label}</span>
          {isTranslating ? (
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
          ) : (
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
          )}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: inline ? 0 : (dropUp ? 8 : -8), scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: inline ? 0 : (dropUp ? 8 : -8), scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={
              inline
                ? "w-full max-h-48 overflow-y-auto overscroll-contain rounded-xl bg-card border border-primary/20 mt-2"
                : `absolute left-0 ${dropdownPosition} w-48 max-h-[40vh] overflow-y-auto overscroll-contain rounded-xl bg-card border border-primary/20 shadow-2xl shadow-primary/5 z-[100]`
            }
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => { setLanguage(lang.code); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                  currentLanguage === lang.code
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
              >
                <span className="text-xs font-mono uppercase w-6 text-center opacity-60">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
