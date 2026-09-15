// Lightweight client diagnostics for the bug-report widget.
// Installs (once) a fetch wrapper + global error listeners that keep a small ring
// buffer of recent API failures and JS errors, so a bug report auto-attaches the
// context needed to diagnose it (e.g. "403 on issue-verify-token" would have caught
// the CORS bug instantly). Zero deps, fails safe.

type ApiError = { url: string; status: number; ts: number };
const MAX = 6;
const apiErrors: ApiError[] = [];
const jsErrors: string[] = [];
let installed = false;

const INTERESTING = /supabase\.co|vercel\.app|combowick/i;

export function installDiagnostics() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // Wrap fetch to record non-2xx responses to our own APIs (no bodies, just url+status).
  try {
    const orig = window.fetch;
    window.fetch = async function (this: unknown, ...args: Parameters<typeof fetch>) {
      const res = await orig.apply(this, args as any);
      try {
        const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url || String(args[0]);
        if (!res.ok && INTERESTING.test(url)) {
          apiErrors.push({ url: url.slice(0, 200), status: res.status, ts: Date.now() });
          if (apiErrors.length > MAX) apiErrors.shift();
        }
      } catch {
        /* ignore */
      }
      return res;
    } as typeof fetch;
  } catch {
    /* ignore */
  }

  try {
    window.addEventListener("error", (e) => {
      const msg = e?.message ? String(e.message).slice(0, 160) : "error";
      jsErrors.push(msg);
      if (jsErrors.length > MAX) jsErrors.shift();
    });
    window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
      const r = e?.reason;
      const msg = (r && (r.message || String(r))) ? String(r.message || r).slice(0, 160) : "unhandledrejection";
      jsErrors.push(msg);
      if (jsErrors.length > MAX) jsErrors.shift();
    });
  } catch {
    /* ignore */
  }
}

function ls(key: string): string {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

export interface Diagnostics {
  ua: string;
  viewport: string;
  language: string;
  verifyToken: string;
  hwidKey: string;
  verifyStep: string;
  stepsDone: string;
  apiErrors: ApiError[];
  jsErrors: string[];
  url: string;
}

export function collectDiagnostics(): Diagnostics {
  // verify_token / hwid_key_data: report presence + validity, never the secret value.
  let verifyToken = "none";
  try {
    const raw = ls("verify_token");
    if (raw) {
      const p = JSON.parse(raw) as { expires_at?: string };
      const valid = p?.expires_at && new Date(p.expires_at).getTime() > Date.now();
      verifyToken = valid ? "present (valid)" : "present (EXPIRED)";
    }
  } catch {
    verifyToken = "present (unparseable)";
  }
  const hwidKey = ls("hwid_key_data") ? "present" : "none";
  const stepsDone = ["step1_completed", "step2_completed", "step3_completed"]
    .filter((k) => ls(k) === "true")
    .map((k) => k.replace("_completed", ""))
    .join(",") || "none";

  return {
    ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
    viewport: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "",
    language: typeof navigator !== "undefined" ? navigator.language : "",
    verifyToken,
    hwidKey,
    verifyStep: ls("verification_step") || "none",
    stepsDone,
    apiErrors: [...apiErrors],
    jsErrors: [...jsErrors],
    url: typeof window !== "undefined" ? window.location.href.slice(0, 300) : "",
  };
}
