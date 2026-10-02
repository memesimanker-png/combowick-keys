// Offer wall (CPALead + CPAGrip, merged server-side by cpa-offers?network=all) — shared helpers.
// Offers + tracking live on the CPA backend (yotuube Supabase); the key token is only
// issued by our own `issue-verify-token` after that backend confirms the offer step.
import { useEffect, useState } from "react";

const FN = "https://hkspkqbnjdkwyyvxqglv.supabase.co/functions/v1";
const OFFERS_URL = `${FN}/cpa-offers`;
export const CPA_STATUS_URL = `${FN}/cpa-status`;
export const CPA_AWAY_SECONDS = 40;
const LOAD_TIMEOUT_MS = 7000;

export type CpaKind = "app" | "survey" | "phone" | "email";
export const CPA_KINDS: CpaKind[] = ["app", "survey", "phone", "email"];
export type CpaOffer = {
  offer_id: string;
  title: string;
  description: string;
  kind: CpaKind;
  offerlink: string;
  offerphoto: string;
  payout?: string; // network payout (USD) — used only to order offers, never shown
  network?: "cpalead" | "cpagrip"; // CPAGrip links already carry tracking_id=<subid> (set server-side)
};

const SS = {
  subid: "cpa_subid",
  away: "cpa_away_ms",
  current: "cpa_current_offer",
  choice: "cpa_choice",
  links: "cpa_links",
  tried: "cpa_tried_at", // first time this visitor opened ANY offer (gates the Linkvertise option)
};

// Kept in localStorage (not sessionStorage): CPALead postbacks can land 10–15 min after the
// offer is finished, often after the visitor closed the tab. Keeping the same subid on the
// device means they get unlocked automatically when they come back. Expires after 48h.
const TTL_MS = 48 * 3600 * 1000;
const STARTED = "cpa_started_at";
function ssGet(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
function ssSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch {} }
function ssDel(k: string) { try { localStorage.removeItem(k); } catch {} }
(function expireOld() {
  try {
    const at = Number(localStorage.getItem(STARTED)) || 0;
    if (at && Date.now() - at > TTL_MS) { ["cpa_subid", "cpa_away_ms", "cpa_current_offer", "cpa_choice", "cpa_links", "cpa_tried_at", STARTED].forEach(ssDel); }
  } catch {}
})();

export function getCpaSubid(): string {
  const e = ssGet(SS.subid);
  if (e) return e;
  const rnd = (crypto as any)?.randomUUID?.().replace(/-/g, "") ||
    Math.random().toString(36).slice(2) + Date.now().toString(36);
  const subid = `cw_${rnd}`.slice(0, 40);
  ssSet(SS.subid, subid);
  ssSet(STARTED, String(Date.now()));
  return subid;
}

export const cpaSession = {
  getAway: () => Number(ssGet(SS.away)) || 0,
  setAway: (ms: number) => ssSet(SS.away, String(ms)),
  getCurrent: (): CpaOffer | null => { try { return JSON.parse(ssGet(SS.current) || "null"); } catch { return null; } },
  setCurrent: (o: CpaOffer) => ssSet(SS.current, JSON.stringify(o)),
  getChoice: () => ssGet(SS.choice),
  triedAt: () => Number(ssGet(SS.tried)) || 0,
  markTried: () => { if (!Number(ssGet(SS.tried))) ssSet(SS.tried, String(Date.now())); },
  setChoice: (c: string | null) => (c ? ssSet(SS.choice, c) : ssDel(SS.choice)),
  /** after a key token is issued — next verify run starts a fresh offer-wall session */
  // The FIRST tracking link a visitor opened for each offer is kept and reused. The offers API
  // rotates tracking domains on every call, and each open is a new CPALead click — advertisers
  // (e.g. Surveoo) flag a registration started on one click and finished on another as fraud.
  linkFor: (o: CpaOffer): string => {
    try { return (JSON.parse(ssGet(SS.links) || "{}")[o.offer_id]?.link) || o.offerlink; } catch { return o.offerlink; }
  },
  lastOpenAt: (offerId: string): number => {
    try { return Number(JSON.parse(ssGet(SS.links) || "{}")[offerId]?.at) || 0; } catch { return 0; }
  },
  rememberOpen: (o: CpaOffer, link: string) => {
    try {
      const m = JSON.parse(ssGet(SS.links) || "{}");
      m[o.offer_id] = { link: m[o.offer_id]?.link || link, at: Date.now() };
      ssSet(SS.links, JSON.stringify(m));
    } catch {}
  },
  reset: () => { Object.values(SS).forEach(ssDel); ssDel(STARTED); },
};

// Offers this device already completed. Most offers are "new users only", so the same person can't
// be paid twice — hide them on this device for DONE_TTL_MS (30 days, so a shared family device or an
// advertiser that allows a repeat later never loses money for good). The server separately hides
// offers completed from the same IP, but only until midnight US Central (shared Wi-Fi).
const DONE_KEY = "cpa_done_offers";
const DONE_TTL_MS = 30 * 24 * 3600 * 1000;
function readDone(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(DONE_KEY) || "{}");
    if (Array.isArray(raw)) return Object.fromEntries(raw.map((id: string) => [id, Date.now()])); // old format
    return raw && typeof raw === "object" ? raw : {};
  } catch { return {}; }
}
export function doneOffers(): Set<string> {
  const now = Date.now();
  return new Set(Object.entries(readDone()).filter(([, at]) => now - Number(at) < DONE_TTL_MS).map(([id]) => id));
}
export function markOfferDone(offerId: string) {
  try {
    const now = Date.now();
    const d = Object.fromEntries(Object.entries(readDone()).filter(([, at]) => now - Number(at) < DONE_TTL_MS));
    d[offerId] = now;
    localStorage.setItem(DONE_KEY, JSON.stringify(d));
  } catch {}
}

let country = "";
export function cpaTrack(subid: string, event: string, extra: { kind?: string; offer_id?: string } = {}) {
  try {
    fetch(CPA_STATUS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subid, event, country, site: "keys", ...extra }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

function deviceType() {
  const ua = navigator.userAgent || "";
  return /android/i.test(ua) ? "android" : /iphone|ipad|ipod/i.test(ua) ? "ios" : /mobi/i.test(ua) ? "mobile" : "desktop";
}

/** Loads the visitor's offers once `enabled` is true. status "none" = no offers / disabled / failed. */
export function useCpaOffers(enabled: boolean | null) {
  // blocked = "vpn" when the visitor is on a VPN/proxy/datacenter IP (CPALead blocks those clicks)
  // lockerOk = false: Alternate offers keeps coming up empty for this country (server-learned) -> hide it
  const [state, setState] = useState<{ status: "loading" | "ready" | "none"; offers: CpaOffer[]; country: string; blocked?: string; lockerOk?: boolean }>(
    { status: "loading", offers: [], country: "" },
  );
  useEffect(() => {
    if (enabled === null) return; // settings not loaded yet
    if (!enabled) { setState({ status: "none", offers: [], country: "" }); return; }
    let done = false;
    const subid = getCpaSubid();
    const ctl = new AbortController();
    const timer = window.setTimeout(() => { if (!done) { done = true; ctl.abort(); setState({ status: "none", offers: [], country: "" }); } }, LOAD_TIMEOUT_MS);
    fetch(`${OFFERS_URL}?network=all&device=${deviceType()}&subid=${encodeURIComponent(subid)}`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        country = d?.country || "";
        const alreadyDone = doneOffers();
        const offers: CpaOffer[] = (Array.isArray(d?.offers) ? d.offers : [])
          .filter((o: CpaOffer) => CPA_KINDS.includes(o.kind) && !alreadyDone.has(o.offer_id));
        setState({ status: offers.length ? "ready" : "none", offers, country, blocked: d?.blocked || undefined, lockerOk: d?.lockerOk !== false });
        cpaTrack(subid, offers.length ? "view" : "no_offers");
      })
      .catch(() => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        setState({ status: "none", offers: [], country: "" });
      });
    return () => { done = true; window.clearTimeout(timer); ctl.abort(); };
  }, [enabled]);
  return state;
}
