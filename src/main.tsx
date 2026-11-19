import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { rememberCodeFromUrl } from "./lib/creator-code";
import { rememberSourceFromUrl } from "./lib/sale-source";
import { initialLanguage, loadManualTranslations } from "./lib/translation-context";

// Build marker — also rotates the main bundle hash (2026-10-01: CDN had cached a 404 for the old name).
(window as any).__cwBuild = "2026-10-01b";

// creator links (?code=ZEN) work on ANY page: remembered here, applied at checkout
rememberCodeFromUrl();
// ?src= (which hub card / Discord post sent them) is remembered the same way and saved with the sale
rememberSourceFromUrl();

// 2026-11-19: after a deploy, a tab opened before it asks for page files that no longer exist ("Failed to fetch
// dynamically imported module") and the whole site showed "Something broke". Reload once to get the new build.
window.addEventListener("vite:preloadError", (e) => {
  try {
    // at most once a minute (a second deploy later in the same tab still reloads; a real 404 can't loop)
    if (Date.now() - Number(sessionStorage.getItem("cw_chunk_reload") || 0) < 60000) return;
    sessionStorage.setItem("cw_chunk_reload", String(Date.now()));
  } catch { /* storage blocked: still reload once per page load */ }
  e.preventDefault();
  window.location.reload();
});

// Non-English visitors: wait (max 2.5 s) for the translation chunk so the first paint is already translated.
const renderApp = () => createRoot(document.getElementById("root")!).render(<App />);
if (initialLanguage() !== "en") {
  Promise.race([loadManualTranslations(), new Promise((r) => setTimeout(r, 2500))]).then(renderApp, renderApp);
} else {
  renderApp();
}
