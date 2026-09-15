import { useEffect, useRef, useState } from "react";
import { Bug, X, Send, Loader2, ChevronDown, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "@/lib/translation-context";
import { installDiagnostics, collectDiagnostics } from "@/lib/diagnostics";

const PROXY = "https://v0-secure-discord-proxy.vercel.app";

type ServiceStatus = { key: string; label: string; status: "up" | "down"; detail?: string };
type Health = { ok: boolean; checkedAt: string; services: ServiceStatus[] };

interface Props {
  /** Which page the widget is mounted on — attached to the report. */
  page: string;
  /** Optional game label to attach (e.g. the selected game on access-key). */
  game?: string;
}

const ERR_MSG: Record<string, string> = {
  rate_limited: "You've sent a few reports already — please wait a bit before sending more.",
  busy: "We're getting a lot of reports right now. Try again in a minute.",
  bad_words: "Please rephrase your message without offensive language.",
  bad_email: "That email doesn't look right — leave it blank or fix it.",
  empty: "Please describe the problem first.",
  too_long: "That's a bit long — please shorten your message.",
  discord_error: "Couldn't deliver the report. Please try again shortly.",
  not_configured: "Reporting is temporarily unavailable.",
};

export function BugReportWidget({ page, game }: Props) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showTech, setShowTech] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const fetchedHealth = useRef(false);

  useEffect(() => {
    installDiagnostics();
  }, []);

  // Fetch health the first time the panel is opened (server caches 60s, so this is cheap).
  useEffect(() => {
    if (!open || fetchedHealth.current) return;
    fetchedHealth.current = true;
    setHealthLoading(true);
    fetch(`${PROXY}/api/health`)
      .then((r) => r.json())
      .then((d: Health) => setHealth(d))
      .catch(() => setHealth(null))
      .finally(() => setHealthLoading(false));
  }, [open]);

  const submit = async () => {
    const msg = message.trim();
    if (msg.length < 3) {
      toast({ variant: "destructive", title: t("Almost there"), description: ERR_MSG.empty });
      return;
    }
    setSending(true);
    try {
      const diagnostics = collectDiagnostics();
      const res = await fetch(`${PROXY}/api/webreport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, email: email.trim(), page, game: game || "", url: diagnostics.url, diagnostics }),
      });
      const data = await res.json().catch(() => ({ success: false, error: "discord_error" }));
      if (data?.success) {
        setSent(true);
        setMessage("");
        setEmail("");
        toast({ title: t("Thanks!"), description: t("Your report was sent. We'll look into it.") });
        setTimeout(() => {
          setOpen(false);
          setSent(false);
        }, 1600);
      } else {
        toast({ variant: "destructive", title: t("Couldn't send"), description: ERR_MSG[data?.error] || ERR_MSG.discord_error });
      }
    } catch {
      toast({ variant: "destructive", title: t("Couldn't send"), description: ERR_MSG.discord_error });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating trigger (bottom-left to avoid the Skip-Ads float button on the right). */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-no-popunder
          aria-label={t("Report a problem")}
          className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-primary/40 bg-black/80 px-4 py-2 text-sm font-medium text-primary shadow-lg backdrop-blur transition-colors hover:bg-primary/15"
        >
          <Bug className="h-4 w-4" />
          <span className="hidden sm:inline">{t("Report a problem")}</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 left-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-primary/30 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-white">{t("Report a problem")}</h3>
            </div>
            <button onClick={() => setOpen(false)} aria-label={t("Close")} className="text-muted-foreground hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Health strip */}
          <div className="mb-3 rounded-lg border border-white/10 bg-black/40 p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> {t("System status")}
            </div>
            {healthLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> {t("Checking…")}
              </div>
            ) : health ? (
              <div className="space-y-1">
                {health.services.map((s) => (
                  <div key={s.key} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">{t(s.label)}</span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${s.status === "up" ? "bg-green-500" : "bg-red-500"}`}
                        style={{ boxShadow: s.status === "up" ? "0 0 6px #22c55e" : "0 0 6px #ef4444" }}
                      />
                      <span className={s.status === "up" ? "text-green-400" : "text-red-400"}>
                        {s.status === "up" ? t("Operational") : t("Down")}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">{t("Status unavailable")}</div>
            )}
          </div>

          {sent ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                <Send className="h-5 w-5 text-green-400" />
              </div>
              <p className="text-sm font-medium text-white">{t("Report sent — thank you!")}</p>
            </div>
          ) : (
            <>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("What went wrong? Describe the bug or error you hit…")}
                rows={4}
                maxLength={1000}
                className="w-full resize-none rounded-lg border border-white/15 bg-black/50 p-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-primary/50 focus:outline-none"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder={t("Email (optional — for a reply)")}
                className="mt-2 w-full rounded-lg border border-white/15 bg-black/50 p-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-primary/50 focus:outline-none"
              />

              <button
                type="button"
                onClick={() => setShowTech((v) => !v)}
                className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-zinc-300"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${showTech ? "rotate-180" : ""}`} />
                {t("Technical info attached")}
              </button>
              {showTech && (
                <pre className="mt-1 max-h-32 overflow-auto rounded bg-black/60 p-2 text-[10px] leading-relaxed text-zinc-400">
                  {JSON.stringify(collectDiagnostics(), null, 1)}
                </pre>
              )}

              <button
                onClick={submit}
                disabled={sending}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-purple-500 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? t("Sending…") : t("Send report")}
              </button>
              <p className="mt-2 text-center text-[10px] text-zinc-500">
                {t("No sign-in needed. Basic device info is attached to help us fix it.")}
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
