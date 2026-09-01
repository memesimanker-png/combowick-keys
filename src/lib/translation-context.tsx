import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { LangCode, EN_TEXTS } from "./translations";
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
const TRANSLATION_CACHE_VERSION = "v3-gpt52"; // bump to force re-translation with GPT-5.2
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

async function fetchTranslations(lang: string, texts: string[]): Promise<Record<string, string>> {
  if (!translationCache[lang]) translationCache[lang] = {};

  // Filter out already cached (in memory + localStorage)
  const needed = texts.filter(t => !translationCache[lang][t]);
  if (needed.length === 0) return translationCache[lang];

  try {
    const { data, error } = await supabase.functions.invoke("translate", {
      body: { texts: needed, language: lang },
    });

    if (!error && data?.translations) {
      Object.assign(translationCache[lang], data.translations);
      persistCache();
      reportTranslationOutage(!!data.degraded);
    } else if (error) {
      reportTranslationOutage(true);
    }
  } catch (e) {
    console.error("Translation fetch error:", e);
    reportTranslationOutage(true);
  }

  return translationCache[lang];
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<LangCode>(() => {
    const saved = localStorage.getItem("combowick-lang");
    if (saved) return saved as LangCode;
    const supported: LangCode[] = ["en","fr","th","ko","zh-CN","de","ru","id","pt","fil","es","vi"];
    const navLang = (navigator.language || "en").toLowerCase();
    const exact = supported.find((c) => c.toLowerCase() === navLang);
    if (exact) return exact;
    const base = navLang.split("-")[0];
    const match = supported.find((c) => c.toLowerCase().split("-")[0] === base);
    return (match || "en") as LangCode;
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [, forceUpdate] = useState(0);
  const langRef = useRef(currentLanguage);

  // IP-based country detection — refines auto-pick if user hasn't manually set a language
  useEffect(() => {
    if (localStorage.getItem("combowick-lang")) return;
    if (localStorage.getItem("combowick-geo-checked")) return;
    const COUNTRY_TO_LANG: Record<string, LangCode> = {
      FR: "fr", BE: "fr", LU: "fr", MC: "fr",
      ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es",
      DE: "de", AT: "de", CH: "de",
      BR: "pt", PT: "pt",
      RU: "ru", BY: "ru", KZ: "ru",
      CN: "zh-CN", TW: "zh-CN", HK: "zh-CN", SG: "zh-CN",
      KR: "ko", TH: "th", ID: "id", PH: "fil", VN: "vi",
    };
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((d) => {
        const country = (d?.country_code || d?.country || "").toUpperCase();
        const detected = COUNTRY_TO_LANG[country];
        localStorage.setItem("combowick-geo-checked", "1");
        if (detected && detected !== langRef.current) {
          setCurrentLanguage(detected);
          langRef.current = detected;
          document.documentElement.lang = detected;
        }
      })
      .catch(() => { localStorage.setItem("combowick-geo-checked", "1"); });
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
    localStorage.setItem("combowick-lang", langCode);
    document.documentElement.lang = langCode;
  }, []);

  // When language changes, preload all EN_TEXTS translations + start DOM auto-translator
  useEffect(() => {
    if (currentLanguage === "en") {
      stopAutoTranslator();
      startAutoTranslator("en");
      return;
    }
    setIsTranslating(true);
    const allTexts = Object.values(EN_TEXTS);
    fetchTranslations(currentLanguage, allTexts).then(() => {
      setIsTranslating(false);
      forceUpdate(n => n + 1);
      // Start auto-translating any DOM text not handled by t()
      startAutoTranslator(currentLanguage);
    });
    return () => { stopAutoTranslator(); };
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
    const lang = langRef.current;
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
  }, [flushPending]);

  return (
    <TranslationContext.Provider value={{ currentLanguage, setLanguage, t, isTranslating: isTranslating || autoBusy, translationOutage }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}
