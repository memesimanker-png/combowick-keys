import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { LangCode, EN_TEXTS, applyDir } from "./translations";
import { supabase } from "@/integrations/supabase/client";
import { startAutoTranslator, stopAutoTranslator, setAutoTranslateBusyListener, setTranslationOutageListener, reportTranslationOutage } from "./auto-translator";

// Pre-translated "translation is down" notice for every supported language.
// Hardcoded because when this shows, the translation service itself is offline.
export const OUTAGE_MESSAGES: Record<string, string> = {
  en: "Translation isn't working right now — try again later!",
  fr: "La traduction ne fonctionne pas pour le moment — réessayez plus tard !",
  th: "ระบบแปลภาษาใช้งานไม่ได้ในขณะนี้ — โปรดลองใหม่ภายหลัง!",
  ko: "지금은 번역이 작동하지 않습니다 — 나중에 다시 시도하세요!",
  "zh-CN": "翻译功能暂时无法使用 — 请稍后再试！",
  de: "Die Übersetzung funktioniert gerade nicht — versuche es später erneut!",
  ru: "Перевод сейчас не работает — попробуйте позже!",
  id: "Terjemahan sedang tidak berfungsi — coba lagi nanti!",
  pt: "A tradução não está funcionando agora — tente novamente mais tarde!",
  fil: "Hindi gumagana ang pagsasalin ngayon — subukan muli mamaya!",
  es: "La traducción no funciona en este momento — ¡inténtalo más tarde!",
  vi: "Bản dịch hiện không hoạt động — vui lòng thử lại sau!",
  ar: "الترجمة لا تعمل حاليًا — حاول مرة أخرى لاحقًا!",
};

interface TranslationContextType {
  currentLanguage: LangCode;
  setLanguage: (langCode: string) => void;
  t: (text: string) => string;
  isTranslating: boolean;
  translationOutage: boolean;
}

const TranslationContext = createContext<TranslationContextType>({
  currentLanguage: "en",
  setLanguage: () => {},
  t: (text: string) => text,
  isTranslating: false,
  translationOutage: false,
});

// Load cache from localStorage on init
const TRANSLATION_CACHE_VERSION = "v10-manual"; // bump to seed hand-translated strings
const translationCache: Record<string, Record<string, string>> = (() => {
  try {
    const ver = localStorage.getItem("combowick-translations-ver");
    if (ver !== TRANSLATION_CACHE_VERSION) {
      localStorage.removeItem("combowick-translations");
      localStorage.removeItem("combowick-auto-translations");
      localStorage.setItem("combowick-translations-ver", TRANSLATION_CACHE_VERSION);
      return {};
    }
    const saved = localStorage.getItem("combowick-translations");
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
})();

// Hand-translated (manual) strings. 2026-11-19: loaded as a SEPARATE chunk, only when a non-English language is in
// use (it was ~1.1 MB of the main bundle, parsed by every visitor). main.tsx waits for it before the first render
// when the visitor's language isn't English, so translated pages don't flash English. Manual entries win over cache.
let manualPromise: Promise<void> | null = null;
export function loadManualTranslations(): Promise<void> {
  if (!manualPromise) {
    manualPromise = import("./manual-translations")
      .then((m) => {
        for (const [lang, dict] of Object.entries(m.MANUAL_TRANSLATIONS)) {
          if (!translationCache[lang]) translationCache[lang] = {};
          Object.assign(translationCache[lang], dict);
        }
      })
      .catch(() => { manualPromise = null; });   // a failed chunk load can be retried on the next language switch
  }
  return manualPromise;
}

/** Translation lookup for code outside the provider (ErrorBoundary). English if not loaded yet. */
export function manualText(lang: string, s: string): string {
  return (lang && lang !== "en" && translationCache[lang]?.[s]) || s;
}

const SUPPORTED_LANGS: LangCode[] = ["en","fr","th","ko","zh-CN","de","ru","id","pt","fil","es","vi","ar"];
/** The language the site starts in: the saved choice, else the browser language, else English. */
export function initialLanguage(): LangCode {
  let saved: string | null = null;
  try { saved = localStorage.getItem("combowick-lang"); } catch { /* storage blocked */ }
  if (saved && SUPPORTED_LANGS.includes(saved as LangCode)) return saved as LangCode;
  const navLang = (typeof navigator !== "undefined" && navigator.language ? navigator.language : "en").toLowerCase();
  const exact = SUPPORTED_LANGS.find((c) => c.toLowerCase() === navLang);
  if (exact) return exact;
  const base = navLang.split("-")[0];
  const match = SUPPORTED_LANGS.find((c) => c.toLowerCase().split("-")[0] === base);
  return (match || "en") as LangCode;
}

function persistCache() {
  try {
    localStorage.setItem("combowick-translations", JSON.stringify(translationCache));
  } catch { /* quota exceeded, ignore */ }
}

// Queue for pending translation requests
let pendingTexts: Set<string> = new Set();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushPromise: Promise<void> | null = null;
let currentFlushLang: string | null = null;

async function fetchTranslations(lang: string, _texts: string[]): Promise<Record<string, string>> {
  // Manual-only: every translation comes from the statically-seeded cache
  // (MANUAL_TRANSLATIONS). No runtime translation API is ever called.
  // Any string not present simply falls back to its English source.
  if (!translationCache[lang]) translationCache[lang] = {};
  return translationCache[lang];
}

// 2026-11-19: storage can be blocked (WebViews with DOM storage off, "block all cookies"): a throw here took down the whole app.
const lsGet = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<LangCode>(() => initialLanguage());
  const [isTranslating, setIsTranslating] = useState(false);
  const [, forceUpdate] = useState(0);
  const langRef = useRef(currentLanguage);

  // IP-based country detection — refines auto-pick if user hasn't manually set a language
  useEffect(() => {
    if (lsGet("combowick-lang")) return;
    if (lsGet("combowick-geo-checked")) return;
    const COUNTRY_TO_LANG: Record<string, LangCode> = {
      FR: "fr", BE: "fr", LU: "fr", MC: "fr",
      ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es",
      DE: "de", AT: "de", CH: "de",
      BR: "pt", PT: "pt",
      RU: "ru", BY: "ru", KZ: "ru",
      CN: "zh-CN", TW: "zh-CN", HK: "zh-CN", SG: "zh-CN",
      KR: "ko", TH: "th", ID: "id", PH: "fil", VN: "vi",
      SA: "ar", AE: "ar", KW: "ar", QA: "ar", BH: "ar", OM: "ar", YE: "ar", IQ: "ar", JO: "ar", LB: "ar", SY: "ar", PS: "ar",
      EG: "ar", LY: "ar", SD: "ar", TN: "ar", DZ: "ar", MA: "ar", MR: "ar",
    };
    // Cloudflare edge geo (unlimited, same-origin) — store is behind Cloudflare, so
    // /cdn-cgi/trace returns loc=<country>. Replaces ipapi.co (was rate-limited → 429).
    fetch("/cdn-cgi/trace")
      .then((r) => r.text())
      .then((txt) => {
        const country = ((txt.match(/loc=([A-Z]{2})/) || [])[1] || "").toUpperCase();
        const detected = COUNTRY_TO_LANG[country];
        lsSet("combowick-geo-checked", "1");
        if (detected && detected !== langRef.current) {
          setCurrentLanguage(detected);
          langRef.current = detected;
          applyDir(detected);
        }
      })
      .catch(() => { lsSet("combowick-geo-checked", "1"); });
  }, []);

  // Reflect the DOM auto-translator's network activity in the floating indicator,
  // so navigating to a new page (e.g. Blog) shows "Translating…" too.
  const [autoBusy, setAutoBusy] = useState(false);
  const [translationOutage, setTranslationOutage] = useState(false);
  useEffect(() => {
    setAutoTranslateBusyListener(setAutoBusy);
    setTranslationOutageListener(setTranslationOutage);
    return () => {
      setAutoTranslateBusyListener(null);
      setTranslationOutageListener(null);
    };
  }, []);


  const setLanguage = useCallback((langCode: string) => {
    const code = langCode as LangCode;
    setCurrentLanguage(code);
    langRef.current = code;
    lsSet("combowick-lang", langCode);
    applyDir(langCode);
  }, []);

  // Manual-only: translations are seeded statically into the cache (MANUAL_TRANSLATIONS),
  // so on language change we just re-render. No translation API, no DOM auto-translator.
  useEffect(() => {
    applyDir(currentLanguage); // also covers the saved/browser language on first load
    forceUpdate((n) => n + 1);
    // non-English: make sure the dictionary chunk is in, then re-render (instant if main.tsx already loaded it)
    if (currentLanguage !== "en") {
      let alive = true;
      void loadManualTranslations().then(() => { if (alive) forceUpdate((n) => n + 1); });
      return () => { alive = false; };
    }
  }, [currentLanguage]);

  // Flush queued texts
  const flushPending = useCallback(() => {
    const lang = langRef.current;
    if (lang === "en" || pendingTexts.size === 0) return;

    const texts = Array.from(pendingTexts);
    pendingTexts = new Set();

    flushPromise = fetchTranslations(lang, texts).then(() => {
      forceUpdate(n => n + 1);
      flushPromise = null;
    });
  }, []);

  const t = useCallback((text: string) => {
    const lang = currentLanguage; // read from state so a language switch re-renders immediately
    // Resolve EN value: if `text` is a key in EN_TEXTS use the value, otherwise treat `text` itself as the source.
    const enValue = EN_TEXTS[text] ?? text;
    if (lang === "en") return enValue;

    // Look up cache by the English source text (not the lookup key)
    const cached = translationCache[lang]?.[enValue];
    if (cached) return cached;

    // Queue the English source text for batch fetch
    pendingTexts.add(enValue);
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flushPending, 50);

    // Return English as fallback while loading
    return enValue;
  }, [flushPending, currentLanguage]);

  return (
    <TranslationContext.Provider value={{ currentLanguage, setLanguage, t, isTranslating: isTranslating || autoBusy, translationOutage }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}
