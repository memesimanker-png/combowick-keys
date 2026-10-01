import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Build marker — also rotates the main bundle hash (2026-10-01: CDN had cached a 404 for the old name).
(window as any).__cwBuild = "2026-10-01b";

createRoot(document.getElementById("root")!).render(<App />);
