import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ClipboardList, ExternalLink, Loader2, Mail, Phone, ShieldCheck, Smartphone, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";
import {
  CPA_AWAY_SECONDS, CPA_KINDS, CPA_STATUS_URL, cpaSession, cpaTrack,
  type CpaKind, type CpaOffer,
} from "@/lib/cpa";

// Offer wall for the free key. Visitors pick a section (Apps / Surveys / Phone / Email) and do
// one offer. Unlocks on a CPALead postback, or after CPA_AWAY_SECONDS spent AWAY on the offer
// tab (pauses while they sit on this page). Either way the server (issue-verify-token, CPA mode)
// re-checks before handing out the key token.

const SECTIONS: Record<CpaKind, { label: string; title: string; note: string; icon: typeof Smartphone; text: string; on: string }> = {
  app: {
    label: "Apps", title: "Download an app", icon: Smartphone,
    note: "No email needed. Install a free app or game and open it.",
    text: "text-emerald-400", on: "border-emerald-500/60 bg-emerald-500/10",
  },
  survey: {
    label: "Surveys", title: "Quick survey", icon: ClipboardList,
    note: "Answer a few questions. Some ask for an email at the start.",
    text: "text-sky-400", on: "border-sky-500/60 bg-sky-500/10",
  },
  phone: {
    label: "Phone", title: "Phone number", icon: Phone,
    note: "Enter your number and type the code you get by text.",
    text: "text-violet-400", on: "border-violet-500/60 bg-violet-500/10",
  },
  email: {
    label: "Email", title: "Sign up with email", icon: Mail,
    note: "Use any email — a spare one works fine.",
    text: "text-amber-400", on: "border-amber-500/60 bg-amber-500/10",
  },
};

type Phase = "pick" | "confirming" | "done" | "error";

export function CpaOfferWall({ offers, subid, onDone }: { offers: CpaOffer[]; subid: string; onDone: () => void }) {
  const { t } = useTranslation();
  const byKind = useMemo(() => {
    const m: Record<CpaKind, CpaOffer[]> = { app: [], survey: [], phone: [], email: [] };
    for (const o of offers) m[o.kind]?.push(o);
    return m;
  }, [offers]);

  const [tab, setTab] = useState<CpaKind | null>(() => CPA_KINDS.find((k) => byKind[k].length) ?? null);
  const [current, setCurrent] = useState<CpaOffer | null>(() => cpaSession.getCurrent());
  const [awayMs, setAwayMs] = useState(() => cpaSession.getAway());
  const [isAway, setIsAway] = useState(false);
  const [phase, setPhase] = useState<Phase>("pick");
  const [finished, setFinished] = useState(false); // timer reached or postback seen

  const awaySince = useRef<number | null>(null);
  const awayBase = useRef(awayMs);
  const retries = useRef(0);

  // ---- timer: only counts while the visitor is away on the offer ----
  useEffect(() => {
    if (!current || finished) return;
    const away = () => document.visibilityState === "hidden" || !document.hasFocus();
    const sync = () => {
      const now = Date.now();
      if (away()) {
        if (awaySince.current === null) awaySince.current = now;
        setIsAway(true);
      } else {
        if (awaySince.current !== null) { awayBase.current += now - awaySince.current; awaySince.current = null; }
        setIsAway(false);
      }
      const total = awayBase.current + (awaySince.current !== null ? now - awaySince.current : 0);
      setAwayMs(total);
      cpaSession.setAway(total);
      if (total >= CPA_AWAY_SECONDS * 1000) setFinished(true);
    };
    sync();
    const id = window.setInterval(sync, 500);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("blur", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("blur", sync);
      window.removeEventListener("focus", sync);
    };
  }, [current, finished]);

  // ---- postback: a real completion unlocks right away ----
  useEffect(() => {
    if (!current || finished) return;
    const tick = async () => {
      try {
        const r = await fetch(`${CPA_STATUS_URL}?subid=${encodeURIComponent(subid)}`);
        if (r.ok && (await r.json())?.completed) setFinished(true);
      } catch {}
    };
    const id = window.setInterval(tick, 5000);
    return () => window.clearInterval(id);
  }, [current, finished, subid]);

  // ---- finished -> ask our server for the key token ----
  const confirm = useCallback(async () => {
    setPhase("confirming");
    const { data, error } = await supabase.functions.invoke("issue-verify-token", { body: { method: "cpa", subid } });
    if (!error && data?.success && data?.token) {
      localStorage.setItem("verify_token", JSON.stringify({ token: data.token, expires_at: data.expires_at }));
      ["step1_completed", "step2_completed", "step3_completed"].forEach((k) => localStorage.setItem(k, "true"));
      localStorage.removeItem("verification_step");
      cpaTrack(subid, "timer_unlock", current ? { kind: current.kind, offer_id: current.offer_id } : {});
      cpaSession.reset();
      setPhase("done");
      window.setTimeout(onDone, 1200);
      return;
    }
    // Server clock can lag the page by a second or two — retry a few times before giving up.
    if (retries.current < 5) {
      retries.current += 1;
      window.setTimeout(confirm, 3000);
      return;
    }
    setPhase("error");
  }, [subid, current, onDone]);

  useEffect(() => { if (finished && phase === "pick") confirm(); }, [finished, phase, confirm]);

  const openOffer = (o: CpaOffer) => {
    setCurrent(o);
    cpaSession.setCurrent(o);
    cpaTrack(subid, "open_offer", { kind: o.kind, offer_id: o.offer_id });
    window.open(o.offerlink, "_blank", "noopener,noreferrer");
  };

  const pickTab = (k: CpaKind) => { setTab(k); cpaTrack(subid, "tab", { kind: k }); };

  if (phase === "done" || phase === "confirming") {
    return (
      <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6 text-center">
        {phase === "done"
          ? <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-400" />
          : <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />}
        <p className="text-lg font-bold">{phase === "done" ? `${t("Completed")} ✅` : t("Confirming…")}</p>
        {phase === "done" && <p className="mt-1 text-sm text-muted-foreground">{t("You're all set — getting your key…")}</p>}
      </div>
    );
  }

  const pct = Math.min(100, (awayMs / (CPA_AWAY_SECONDS * 1000)) * 100);
  const sec = tab ? SECTIONS[tab] : null;

  return (
    <div className="space-y-4">
      {phase === "error" && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-center text-sm">
          <p>{t("Something went wrong. Please try again.")}</p>
          <button type="button" onClick={() => { retries.current = 0; confirm(); }} className="mt-2 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            {t("Try again")}
          </button>
        </div>
      )}

      {current && phase === "pick" && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
          <div className="flex items-center gap-2 text-xs">
            {isAway ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" /> : <Timer className="h-4 w-4 shrink-0 text-primary" />}
            <span className="min-w-0 flex-1">
              {isAway
                ? <><b className="block truncate">{current.title}</b>{t("Checking… finish the offer in the other tab.")}</>
                : <><b>{t("Paused")}</b> — {t("you haven't finished the offer yet. Go back and finish it to unlock.")}</>}
            </span>
            {!isAway && (
              <button type="button" onClick={() => openOffer(current)} className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                {t("Finish offer")}
              </button>
            )}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{t("Pick the kind of step you like best, then do one.")}</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CPA_KINDS.map((k) => {
          const s = SECTIONS[k], n = byKind[k].length, on = tab === k;
          return (
            <button
              key={k}
              type="button"
              disabled={!n}
              onClick={() => pickTab(k)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${on ? s.on : "border-border bg-secondary/30 hover:bg-secondary/60"}`}
            >
              <s.icon className={`h-5 w-5 ${s.text}`} />
              <span>{t(s.label)}</span>
              <span className="text-[10px] font-normal text-muted-foreground">
                {n === 0 ? t("none") : n === 1 ? t("1 option") : t("{n} options").replace("{n}", String(n))}
              </span>
            </button>
          );
        })}
      </div>

      {tab && sec && (
        <section>
          <div className="mb-1 flex items-center gap-2">
            <sec.icon className={`h-4 w-4 ${sec.text}`} />
            <h4 className="text-sm font-bold">{t(sec.title)}</h4>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">{t(sec.note)}</p>
          <div className="space-y-2">
            {byKind[tab].map((o) => (
              <button
                key={o.offer_id}
                type="button"
                onClick={() => openOffer(o)}
                className={`flex w-full items-center gap-3 rounded-lg border bg-secondary/20 p-3 text-left transition-colors hover:border-primary/50 hover:bg-secondary/50 ${current?.offer_id === o.offer_id ? "border-primary/60" : "border-border"}`}
              >
                <img
                  src={o.offerphoto}
                  alt=""
                  loading="lazy"
                  className="h-11 w-11 shrink-0 rounded-md bg-secondary object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{o.title}</span>
                  <span className="line-clamp-2 block text-xs text-muted-foreground">{o.description}</span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> {t("Finish the step in the new tab — this page unlocks automatically.")}
      </p>
    </div>
  );
}
