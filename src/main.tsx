import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { rememberCodeFromUrl } from "./lib/creator-code";
import { rememberSourceFromUrl } from "./lib/sale-source";

// Build marker — also rotates the main bundle hash (2026-10-01: CDN had cached a 404 for the old name).
(window as any).__cwBuild = "2026-10-01b";

// creator links (?code=ZEN) work on ANY page: remembered here, applied at checkout
rememberCodeFromUrl();
// ?src= (which hub card / Discord post sent them) is remembered the same way and saved with the sale
rememberSourceFromUrl();

createRoot(document.getElementById("root")!).render(<App />);
