import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, Loader2, Mail, Phone, ShieldCheck, Smartphone, Sparkles, PauseCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";
import {
  CPA_AWAY_SECONDS, CPA_KINDS, CPA_STATUS_URL, cpaSession, cpaTrack, markOfferDone,
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

// CPALead Link Locker (overlay mode) — extra offers incl. pay-per-click ones that only exist inside
// lockers. Clicks and completions inside it postback with our subid like any other offer.
const LOCKER = { toolId: "66967", slug: "GkKQSbW", publisherId: 3363958, hash: "#cw-locker" };

export function CpaOfferWall({ offers, subid, onDone, onStuckFallback, country = "", hours = { offer: 24, cpc: 6, lv: 6 }, allowLinkvertise = true, alternateOnly = false, onConfirm, doneTitle, doneText, showHours = true }: {
  offers: CpaOffer[]; subid: string; onDone: () => void; onStuckFallback: () => void; country?: string;
  hours?: { offer: number; cpc: number; lv: number };
  allowLinkvertise?: boolean; // admin master switch verify_settings.linkvertise_enabled
  alternateOnly?: boolean;    // no main offers for this visitor -> only the Alternate offers (locker)
  // Reuse outside the free-key flow (script unlock, key extension): called once a real CPALead
  // postback exists for this subid — any payout, no 6h/24h choice. Return true when it succeeded.
  onConfirm?: (subid: string) => Promise<boolean>;
  doneTitle?: string;
  doneText?: string;
  showHours?: boolean;
}) {
  const hoursLabel = (n: number) => (showHours ? t("{n}-hour key").replace("{n}", String(n)) : "");
  const { t } = useTranslation();
  const byKind = useMemo(() => {
    const m: Record<CpaKind, CpaOffer[]> = { app: [], survey: [], phone: [], email: [] };
    for (const o of offers) m[o.kind]?.push(o);
    return m;
  }, [offers]);

  const kindsWithOffers = useMemo(() => CPA_KINDS.filter((k) => byKind[k].length > 0), [byKind]);
  const [tab, setTab] = useState<CpaKind | null>(() => CPA_KINDS.find((k) => byKind[k].length) ?? null);
  const [current, setCurrent] = useState<CpaOffer | null>(() => cpaSession.getCurrent());
  // Away time / "stuck" is per visit — a returning visitor starts fresh (their offer is still remembered
  // and polled quietly, so a late postback still unlocks them).
  const [awayMs, setAwayMs] = useState(0);
  const [hideReturning, setHideReturning] = useState(false);
  const [isAway, setIsAway] = useState(false);
  const [phase, setPhase] = useState<Phase>("pick");
  const [finished, setFinished] = useState(false); // real postback seen
  const [stuck, setStuck] = useState(false); // spent CPA_AWAY_SECONDS on the offer, still no postback
  // A click-sized payout (pay-per-click, < OFFER_MIN_PAYOUT) arrived: the short key is ready, but the
  // visitor may still finish a bigger offer (e.g. $1.52 install that ALSO paid a click) for the long key.
  const OFFER_MIN_PAYOUT = 0.2;
  const [cpcReady, setCpcReady] = useState(false);
  const [cpcDismissed, setCpcDismissed] = useState(false);
  const cpcReadyRef = useRef(false); // the 4s poll closure would otherwise see a stale cpcReady
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
        if (r.ok) {
          const j = await r.json();
          if (j?.completed) {
            if (j.offer_id) markOfferDone(String(j.offer_id));
            if (onConfirm || Number(j.payout) >= OFFER_MIN_PAYOUT) setFinished(true); // real offer (or custom flow) -> auto
            else if (!cpcReadyRef.current) {
              cpcReadyRef.current = true;
              setCpcReady(true); // click only -> let them choose: short key now, or finish for the long one
              setLockerOpen(false);
            }
          }
        }
      } catch {}
    };
    tick();
    const id = window.setInterval(tick, 4000);
    return () => window.clearInterval(id);
  }, [current, finished, subid]);

  // ---- finished -> ask our server for the key token ----
  const confirm = useCallback(async () => {
    setPhase("confirming");
    if (onConfirm) {
      const ok = await onConfirm(subid).catch(() => false);
      if (ok) {
        setLockerOpen(false);
        cpaTrack(subid, "verified_unlock", current ? { kind: current.kind, offer_id: current.offer_id } : {});
        cpaSession.reset();
        setPhase("done");
        window.setTimeout(onDone, 1200);
        return;
      }
      if (retries.current < 5) { retries.current += 1; window.setTimeout(confirm, 3000); return; }
      setPhase("error");
      return;
    }
    const { data, error } = await supabase.functions.invoke("issue-verify-token", { body: { method: "cpa", subid } });
    if (!error && data?.success && data?.token) {
      localStorage.setItem("verify_token", JSON.stringify({ token: data.token, expires_at: data.expires_at, hours: data.hours }));
      setLockerOpen(false); // locker panel must not cover "Completed"
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
  }, [subid, current, onDone, onConfirm]);

  useEffect(() => { if (finished && phase === "pick") confirm(); }, [finished, phase, confirm]);

  // ---- Link Locker ("Alternate offers") for every visitor ----
  // Pay-per-click offers exist in many countries and on phones (ES, BD, Gulf, TH, US iOS…), and the
  // locker picks offers for the visitor's own country/device, so it is offered to everyone.
  const lockerEligible = true;
  // The locker is embedded INSIDE our own card (iframe) instead of CPALead's pop-up. Its unlock /
  // close messages just collapse the panel — the key itself still comes from our postback poll.
  const [lockerOpen, setLockerOpen] = useState(false);
  const lockerSrc = useMemo(() => {
    // Same URL CPALead's overlay script builds (values are encoded twice, like theirs).
    const u = new URL(`https://www.fastsvr.com/unlock/${encodeURIComponent(LOCKER.slug)}`);
    u.searchParams.set("mode", "overlay");
    u.searchParams.set("title", encodeURIComponent(t("Complete 1 offer below")));
    u.searchParams.set("lockedUrl", encodeURIComponent(`${window.location.origin}${window.location.pathname}`));
    u.searchParams.set("publisherUserId", String(LOCKER.publisherId));
    u.searchParams.set("subid", encodeURIComponent(subid));
    return u.toString();
  }, [subid, t]);
  useEffect(() => {
    if (!lockerOpen) return;
    const onMsg = (e: MessageEvent) => {
      if (!["https://www.fastsvr.com", "https://www.cpalead.com"].includes(e.origin)) return;
      const type = (e.data as any)?.type;
      if (type === "cpalead-unlocked" || type === "cpalead-close-request") setLockerOpen(false);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [lockerOpen]);
  const lockerBoxRef = useRef<HTMLDivElement | null>(null);

  const openLocker = () => {
    setLockerOpen(true);
    window.setTimeout(() => lockerBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    const o: CpaOffer = { offer_id: "locker", title: t("Alternate offers"), description: "", kind: "app", offerlink: "", offerphoto: "" };
    setOpenedThisVisit(true);
    setCurrent(o);
    cpaSession.setCurrent(o);
    cpaTrack(subid, "open_offer", { kind: "locker", offer_id: "locker" });
  };

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
        <p className="text-lg font-bold">{phase === "done" ? (doneTitle || `${t("Completed")} ✅`) : t("Confirming…")}</p>
        {phase === "done" && <p className="mt-1 text-sm text-muted-foreground">{doneText || t("You're all set — getting your key…")}</p>}
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

      {cpcReady && phase === "pick" && !cpcDismissed && (
        <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-center">
          <CheckCircle2 className="mx-auto mb-1.5 h-8 w-8 text-green-400" />
          <p className="text-base font-bold">{t("{n}-hour key unlocked!").replace("{n}", String(hours.cpc))}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Get it now — or finish the offer you opened to get a {n}-hour key instead.").replace("{n}", String(hours.offer))}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" onClick={() => { cpaTrack(subid, "tab", { kind: "cpc_take" }); confirm(); }}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
              {t("Get my {n}-hour key").replace("{n}", String(hours.cpc))} <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => { cpaTrack(subid, "tab", { kind: "cpc_keepgoing" }); setCpcDismissed(true); }}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-secondary/60">
              {t("Keep going for a {n}-hour key").replace("{n}", String(hours.offer))}
            </button>
          </div>
        </div>
      )}
      {cpcReady && phase === "pick" && cpcDismissed && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-2.5 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
          <span className="min-w-0 flex-1">{t("{n}-hour key ready.").replace("{n}", String(hours.cpc))} {t("Finish an offer to upgrade it to {n} hours.").replace("{n}", String(hours.offer))}</span>
          <button type="button" onClick={() => confirm()} className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
            {t("Get it now")}
          </button>
        </div>
      )}
      {current && phase === "pick" && !openedThisVisit && !cpcReady && !hideReturning && (
        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-primary/70" />
          <span className="min-w-0 flex-1">{t("Waiting for your earlier offer to confirm — this page unlocks automatically if it does.")}</span>
          <button type="button" onClick={() => setHideReturning(true)} aria-label={t("Close")} className="shrink-0 rounded p-0.5 hover:bg-secondary hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {current && phase === "pick" && openedThisVisit && (
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
            {!isAway && current.offer_id !== "locker" && (
              <a href={cpaSession.linkFor(current)} target="_blank" rel="noopener noreferrer" onClick={(e) => onOfferClick(e, current)} className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                {t("Finish offer")}
              </a>
            )}
          </div>
          {hint && <p className="mt-1.5 text-[11px] font-medium text-amber-400">{t("Already opened — check your other tab.")}</p>}
          <p className="mt-1.5 text-[11px] text-muted-foreground">{t("After you finish, verifying can take a few minutes.")}</p>
          {stuck && openedThisVisit && !cpcReady && current?.offer_id === "locker" && !alternateOnly && (
            <div className="mt-3 rounded-md border border-border/60 bg-background/40 p-2.5 text-xs">
              <p className="text-muted-foreground"><b className="text-foreground">{t("No payment yet?")}</b> {t("Some offers only count once per person. Try one of the main offers above instead.")}</p>
            </div>
          )}
          {stuck && openedThisVisit && !cpcReady && (allowLinkvertise || (lockerEligible && current?.offer_id !== "locker")) && (
            <div className="mt-3 rounded-md border border-border/60 bg-background/40 p-2.5 text-xs">
              {lockerEligible && current?.offer_id !== "locker" && (
                <div className="mb-2.5">
                  <p className="text-muted-foreground">{t("Stuck? Try the alternate offers instead.")}</p>
                  <button type="button" onClick={() => { cpaTrack(subid, "tab", { kind: "stuck_alt" }); openLocker(); }}
                    className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90">
                    {t("Alternate offers")}{showHours ? ` · ${hoursLabel(hours.cpc)}` : ""} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}
              {allowLinkvertise && (<>
              <p className="text-muted-foreground">{t("Stuck? You can unlock with Linkvertise instead.")}</p>
              <button type="button" onClick={() => { cpaTrack(subid, "stuck_lv"); onStuckFallback(); }}
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-primary/40 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10">
                {t("Use Linkvertise instead")}{showHours ? ` · ${hoursLabel(hours.lv)}` : ""} <ArrowRight className="h-3 w-3" />
              </button>
              </>)}
            </div>
          )}
        </div>
      )}

      {alternateOnly && (
        <div className="rounded-lg border border-border bg-secondary/20 p-3 text-center text-sm">
          <p className="font-semibold">{t("No main offers for your country right now")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("Try the alternate offers below — finish any one to get your key.")}</p>
        </div>
      )}
      {!alternateOnly && (<>
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <span>{kindsWithOffers.length > 1 ? t("Pick the kind of step you like best, then do one.") : t("Pick an offer below")}</span>
        {showHours && <span className="ml-auto shrink-0 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-green-300">{hoursLabel(hours.offer)}</span>}
      </p>

      {/* Only kinds that actually have offers; no tile row at all when there is just one kind. */}
      {kindsWithOffers.length > 1 && (
      <div className={`grid gap-2 ${kindsWithOffers.length === 3 ? "grid-cols-3" : kindsWithOffers.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
        {kindsWithOffers.map((k) => {
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
                {n === 1 ? t("1 option") : t("{n} options").replace("{n}", String(n))}
              </span>
            </button>
          );
        })}
      </div>
      )}

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

      </>)}

      {lockerEligible && (
        <div className={`space-y-1.5 ${alternateOnly ? "" : "border-t border-border/50 pt-4"}`}>
          {!alternateOnly && <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("If the main offers don't work for you")}</p>}
          {lockerOpen ? (
            <div ref={lockerBoxRef} className="scroll-mt-20 overflow-hidden rounded-lg border border-primary/40 bg-card">
              <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
                <span className="text-sm font-semibold text-foreground">{t("Alternate offers")}</span>
                {showHours && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{hoursLabel(hours.cpc)}</span>}
                <button type="button" onClick={() => setLockerOpen(false)} aria-label={t("Close")} className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <iframe
                src={lockerSrc}
                title={t("Alternate offers")}
                className="block h-[460px] w-full border-0 bg-[#111] sm:h-[520px]"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
              />
            </div>
          ) : (
          <button
            type="button"
            onClick={openLocker}
            className="group flex w-full items-center gap-3 rounded-lg border border-border bg-secondary/20 p-3 text-left transition-colors hover:border-primary/40 hover:bg-secondary/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-lg">💻</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">{t("Alternate offers")}</span>
              <span className="block text-xs text-muted-foreground">{t("A different list of offers. Finish any one.")}</span>
            </span>
            {showHours && <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{hoursLabel(hours.cpc)}</span>}
          </button>
          )}
        </div>
      )}

      {/* Before an offer is opened only — afterwards the status box at the top says the same. */}
      {!current && (
        <p className="flex items-center justify-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-center text-xs font-medium text-primary">
          <ShieldCheck className="h-4 w-4 shrink-0" /> {t("Finish the step in the new tab — it can take a few minutes to verify. This page unlocks automatically.")}
        </p>
      )}
    </div>
  );
}
