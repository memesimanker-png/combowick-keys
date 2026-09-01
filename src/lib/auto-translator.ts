// Auto-translates DOM text nodes site-wide for any text not wrapped in t().
// Uses MutationObserver to catch dynamic content. Caches results.
import { supabase } from "@/integrations/supabase/client";

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "INPUT",
  "SVG", "PATH", "CIRCLE", "RECT", "LINE", "POLYGON", "POLYLINE", "G",
]);

const ATTR_ORIGINAL = "data-orig-text";
const ATTR_LANG = "data-translated-lang";

// In-memory cache: lang -> source -> translated
const cache: Record<string, Record<string, string>> = (() => {
  try {
    const saved = localStorage.getItem("combowick-auto-translations");
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
})();

function persistCache() {
  try {
    localStorage.setItem("combowick-auto-translations", JSON.stringify(cache));
  } catch { /* quota: trim oldest lang */
    try {
      const langs = Object.keys(cache);
      if (langs.length > 2) delete cache[langs[0]];
      localStorage.setItem("combowick-auto-translations", JSON.stringify(cache));
    } catch {}
  }
}

let pending: Map<string, Set<Text>> = new Map(); // source text -> nodes
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let currentLang = "en";
let observer: MutationObserver | null = null;

// Busy reporting so the floating indicator can show "Translating…" on every
// page navigation (not just on language switch).
let busyCount = 0;
let busyListener: ((busy: boolean) => void) | null = null;
export function setAutoTranslateBusyListener(fn: ((busy: boolean) => void) | null) {
  busyListener = fn;
}
function setBusy(delta: number) {
  const prev = busyCount;
  busyCount = Math.max(0, busyCount + delta);
  if (prev === 0 && busyCount > 0) busyListener?.(true);
  if (prev > 0 && busyCount === 0) busyListener?.(false);
}

// Outage reporting: when the translate function signals `degraded` (all AI
// sources exhausted), surface it so the UI can show a "translation unavailable"
// notice instead of silently leaving English text.
let outageListener: ((down: boolean) => void) | null = null;
export function setTranslationOutageListener(fn: ((down: boolean) => void) | null) {
  outageListener = fn;
}
export function reportTranslationOutage(down: boolean) {
  outageListener?.(down);
}

// Roles whose visible label is meaningful for state machines (Radix etc.) — skip translation
const SKIP_ROLES = new Set([
  "tab", "option", "menuitem", "menuitemcheckbox", "menuitemradio",
  "radio", "switch", "combobox", "listbox", "treeitem",
]);

function shouldTranslate(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent) return false;
  if (SKIP_TAGS.has(parent.tagName)) return false;
  if (parent.closest("[data-no-translate]")) return false;
  // Skip Radix interactive primitives (tabs, selects, toggles, switches, etc.)
  // Their visible text is used as state identifiers — translating breaks them.
  const interactiveAncestor = parent.closest(
    "[role='tab'],[role='option'],[role='menuitem'],[role='menuitemcheckbox'],[role='menuitemradio'],[role='radio'],[role='switch'],[role='combobox'],[role='listbox'],[role='treeitem'],[data-radix-collection-item]"
  );
  if (interactiveAncestor) return false;
  if (parent.isContentEditable) return false;
  const text = node.nodeValue?.trim() || "";
  if (text.length < 2) return false;
  // Skip pure numbers, prices, urls, single emojis
  if (/^[\d\s$€£¥.,:%/+\-]+$/.test(text)) return false;
  if (/^https?:\/\//.test(text)) return false;
  if (!/[a-zA-Z\u00C0-\u024F]/.test(text)) return false; // need at least one latin letter
  return true;
}

function collectTextNodes(root: Node, out: Text[]) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => shouldTranslate(n as Text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  });
  let n: Node | null;
  while ((n = walker.nextNode())) out.push(n as Text);
}

// Latin-script languages must never render CJK/Hangul/Thai junk (degraded-AI garbage).
const LATIN_LANGS = new Set(["fr", "de", "id", "pt", "fil", "es", "vi"]);
const NON_LATIN_RE = /[\u1100-\u11FF\u3040-\u30FF\u3130-\u318F\uAC00-\uD7AF\u4E00-\u9FFF\u0E00-\u0E7F]/g;
function isValidTranslation(lang: string, translated: string): boolean {
  const t = (translated || "").trim();
  if (!t) return false;
  if (LATIN_LANGS.has(lang)) {
    const bad = (t.match(NON_LATIN_RE) || []).length;
    if (bad > 0 && bad / t.length > 0.15) return false;
  }
  return true;
}

function applyTranslation(node: Text, lang: string) {
  const parent = node.parentElement;
  if (!parent) return;
  const original = node.nodeValue || "";
  const trimmed = original.trim();
  if (!trimmed) return;

  const translated = cache[lang]?.[trimmed];
  if (!translated) return;
  // Purge garbage translations so the readable English stays instead.
  if (!isValidTranslation(lang, translated)) {
    delete cache[lang][trimmed];
    return;
  }

  // Save original once for restoration
  if (!parent.hasAttribute(ATTR_ORIGINAL)) {
    parent.setAttribute(ATTR_ORIGINAL, "1");
  }
  // Preserve leading/trailing whitespace
  const leading = original.match(/^\s*/)?.[0] || "";
  const trailing = original.match(/\s*$/)?.[0] || "";
  node.nodeValue = leading + translated + trailing;
  parent.setAttribute(ATTR_LANG, lang);
}

async function flush() {
  flushTimer = null;
  if (currentLang === "en" || pending.size === 0) return;

  const lang = currentLang;
  const batch = pending;
  pending = new Map();

  const texts = Array.from(batch.keys());
  if (!cache[lang]) cache[lang] = {};
  const needed = texts.filter(t => !cache[lang][t]);

  if (needed.length > 0) {
    setBusy(1);
    let anyDegraded = false;
    let anySuccess = false;
    try {
      // Chunk to avoid huge payloads
      for (let i = 0; i < needed.length; i += 50) {
        const chunk = needed.slice(i, i + 50);
        const { data, error } = await supabase.functions.invoke("translate", {
          body: { texts: chunk, language: lang },
        });
        if (!error && data?.translations) {
          Object.assign(cache[lang], data.translations);
          anySuccess = true;
          if (data.degraded) anyDegraded = true;
        } else if (error) {
          anyDegraded = true;
        }
      }
      persistCache();
      // Clear outage as soon as anything translates again; raise it when degraded.
      if (anySuccess && !anyDegraded) reportTranslationOutage(false);
      else if (anyDegraded) reportTranslationOutage(true);
    } catch (e) {
      console.error("auto-translate fetch error:", e);
      reportTranslationOutage(true);
    } finally {
      setBusy(-1);
    }
  }

  // Apply to all queued nodes
  if (currentLang !== lang) return; // language changed mid-flight
  batch.forEach((nodes, source) => {
    nodes.forEach(node => applyTranslation(node, lang));
  });
}

function queueNode(node: Text) {
  if (currentLang === "en") return;
  const trimmed = node.nodeValue?.trim() || "";
  if (!trimmed) return;

  // Already translated for this lang?
  const cached = cache[currentLang]?.[trimmed];
  if (cached) {
    applyTranslation(node, currentLang);
    return;
  }

  let set = pending.get(trimmed);
  if (!set) { set = new Set(); pending.set(trimmed, set); }
  set.add(node);

  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 250);
}

function processSubtree(root: Node) {
  const nodes: Text[] = [];
  collectTextNodes(root, nodes);
  nodes.forEach(queueNode);
}

function restoreEnglish() {
  // Easiest: reload page-level translations by re-walking and clearing translated nodes.
  // We can't recover originals reliably without storing them per-node.
  // Instead, force a soft reload of components via location.reload-free trick:
  // We trigger this only when switching back to EN.
  window.location.reload();
}

export function startAutoTranslator(lang: string) {
  currentLang = lang;
  if (observer) { observer.disconnect(); observer = null; }

  if (lang === "en") {
    // If we previously translated, restore by reloading
    if (document.querySelector(`[${ATTR_LANG}]`)) {
      restoreEnglish();
    }
    return;
  }

  // Initial sweep
  processSubtree(document.body);

  // Watch for new content
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "childList") {
        m.addedNodes.forEach(n => {
          if (n.nodeType === Node.TEXT_NODE) queueNode(n as Text);
          else if (n.nodeType === Node.ELEMENT_NODE) processSubtree(n);
        });
      } else if (m.type === "characterData") {
        const node = m.target as Text;
        const parent = node.parentElement;
        // Only re-translate if it's not our own translation update
        if (parent && parent.getAttribute(ATTR_LANG) !== currentLang) {
          if (shouldTranslate(node)) queueNode(node);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

export function stopAutoTranslator() {
  if (observer) { observer.disconnect(); observer = null; }
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
}
