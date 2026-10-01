import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, Loader2, Mail, Phone, ShieldCheck, Smartphone, Sparkles, PauseCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";
import {
  CPA_AWAY_SECONDS, CPA_KINDS, CPA_STATUS_URL, cpaSession, cpaTrack,
  type CpaKind, type CpaOffer,
} from "@/lib/cpa";

// Offer wall for the free key. Visitors pick a section (Apps / Surveys / Phone / Email) and do
// one offer. Unlocks ONLY on a real CPALead postback (server re-checks in issue-verify-token).
// After CPA_AWAY_SECONDS spent away on the offer without a postback, the visitor is offered a
// "stuck? use Linkvertise instead" way out (onStuckFallback) — the timer never unlocks anything.

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

export function CpaOfferWall({ offers, subid, onDone, onStuckFallback }: {
  offers: CpaOffer[]; subid: string; onDone: () => void; onStuckFallback: () => void;
}) {
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
  const [finished, setFinished] = useState(false); // real postback seen
  const [stuck, setStuck] = useState(false); // spent CPA_AWAY_SECONDS on the offer, still no postback
  // The Linkvertise way out only shows after an offer was actually opened during THIS visit
  // (a remembered offer from an earlier visit is not enough).
  const [openedThisVisit, setOpenedThisVisit] = useState(false);

  const awaySince = useRef<number | null>(null);
  const awayBase = useRef(awayMs);
  const retries = useRef(0);

  // ---- timer: only counts while the visitor is away on the offer ----
  useEffect(() => {
    if (!current || finished || stuck) return;
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
      if (total >= CPA_AWAY_SECONDS * 1000) { setStuck(true); cpaTrack(subid, "stuck", current ? { kind: current.kind, offer_id: current.offer_id } : {}); }
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
  }, [current, finished, stuck, subid]);

  // ---- postback: a real completion unlocks right away ----
  useEffect(() => {
    if (!current || finished) return;
    const tick = async () => {
      try {
        const r = await fetch(`${CPA_STATUS_URL}?subid=${encodeURIComponent(subid)}`);
        if (r.ok && (await r.json())?.completed) setFinished(true);
      } catch {}
    };
    tick();
    const id = window.setInterval(tick, 4000);
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
      cpaTrack(subid, "verified_unlock", current ? { kind: current.kind, offer_id: current.offer_id } : {});
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

  // Offers open through real <a target="_blank"> links (popup blockers stop window.open on
  // some phones — people then spam-tapped one offer ~60x, which looks like click fraud to
  // CPALead). Re-opening the same offer within REOPEN_MS doesn't fire another click — every
  // extra click restarts the advertiser's session and gets the visitor flagged as fraud.
  const REOPEN_MS = 3 * 60 * 1000;
  const lastOpen = useRef<Record<string, number>>({});
  const [hint, setHint] = useState("");
  const onOfferClick = (e: React.MouseEvent, o: CpaOffer) => {
    const now = Date.now();
    if (now - Math.max(lastOpen.current[o.offer_id] || 0, cpaSession.lastOpenAt(o.offer_id)) < REOPEN_MS) {
      e.preventDefault();
      setHint(o.offer_id);
      window.setTimeout(() => setHint(""), 4000);
      return;
    }
    lastOpen.current[o.offer_id] = now;
    setOpenedThisVisit(true);
    setCurrent(o);
    cpaSession.setCurrent(o);
    cpaSession.rememberOpen(o, (e.currentTarget as HTMLAnchorElement).href || o.offerlink);
    cpaTrack(subid, "open_offer", { kind: o.kind, offer_id: o.offer_id });
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
            {isAway ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" /> : <PauseCircle className="h-4 w-4 shrink-0 text-amber-400" />}
            <span className="min-w-0 flex-1">
              {stuck && !isAway
                ? <><b>{t("Still waiting for the offer to confirm…")}</b> {t("Some offers take up to 15 minutes to confirm. You can leave and come back to this page on this device — it unlocks automatically.")}</>
                : isAway
                ? <><b className="block truncate">{current.title}</b>{t("Checking… finish the offer in the other tab.")}</>
                : <><b>{t("Paused")}</b> — {t("you haven't finished the offer yet. Go back and finish it to unlock.")}</>}
            </span>
            {!isAway && (
              <a href={cpaSession.linkFor(current)} target="_blank" rel="noopener noreferrer" onClick={(e) => onOfferClick(e, current)} className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                {t("Finish offer")}
              </a>
            )}
          </div>
          {hint && <p className="mt-1.5 text-[11px] font-medium text-amber-400">{t("Already opened — check your other tab.")}</p>}
          <p className="mt-1.5 text-[11px] text-muted-foreground">{t("After you finish, verifying can take a few minutes.")}</p>
          {stuck && openedThisVisit && (
            <div className="mt-3 rounded-md border border-border/60 bg-background/40 p-2.5 text-xs">
              <p className="text-muted-foreground">{t("Stuck? You can unlock with Linkvertise instead.")}</p>
              <button type="button" onClick={() => { cpaTrack(subid, "stuck_lv"); onStuckFallback(); }}
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-primary/40 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10">
                {t("Use Linkvertise instead")} <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <span>{t("Pick the kind of step you like best, then do one.")}</span>
      </p>

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
          <p className={`mb-1 text-xs font-medium ${sec.text}`}>{t(sec.note)}</p>
          <p className="mb-3 text-[11px] text-muted-foreground">{t("Use your real details and finish it in one go — don't reopen it or use a VPN, or it won't count.")}</p>
          <div className="space-y-2.5">
            {byKind[tab].map((o) => (
              <div key={o.offer_id} className="cw-glow">
              <a
                href={cpaSession.linkFor(o)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => onOfferClick(e, o)}
                className="group flex w-full items-center gap-3 rounded-[calc(0.5rem-1.5px)] p-3 text-left transition-colors hover:bg-primary/5"
              >
                <img
                  src={o.offerphoto}
                  alt=""
                  loading="lazy"
                  className="h-11 w-11 shrink-0 rounded-md bg-secondary object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-[15px] font-bold leading-snug text-foreground">{o.title}</span>
                  <span className="line-clamp-2 block text-xs text-muted-foreground">{o.description}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/30 transition-transform group-hover:scale-105">
                  {current?.offer_id === o.offer_id ? t("Continue") : t("Start")} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </a>
              {hint === o.offer_id && !current && <p className="px-3 pb-2 text-[11px] font-medium text-amber-400">{t("Already opened — check your other tab.")}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="flex items-center justify-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-center text-xs font-medium text-primary">
        <ShieldCheck className="h-4 w-4 shrink-0" /> {t("Finish the step in the new tab — it can take a few minutes to verify. This page unlocks automatically.")}
      </p>
    </div>
  );
}
