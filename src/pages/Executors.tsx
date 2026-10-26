import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Shield, Monitor, Smartphone, Apple, Tablet, ExternalLink, MessageCircle, ShoppingCart, RefreshCw, AlertCircle,
  CheckCircle2, Search, X, Cpu, Boxes, KeyRound, Code2, Layers, Zap, Download, Copy, Check, Award, ChevronDown,
} from "lucide-react";
import { useTranslation } from "@/lib/translation-context";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type Executor = {
  _id: string;
  title: string;
  version?: string;
  updatedDate?: string;
  uncStatus?: boolean;
  free?: boolean;
  detected?: boolean;
  rbxversion?: string | false;
  updateStatus?: boolean;
  websitelink?: string;
  discordlink?: string;
  purchaselink?: string;
  platform?: string;
  uncPercentage?: number;
  suncPercentage?: number;
  decompiler?: boolean;
  multiInject?: boolean;
  clientmods?: boolean;
  keysystem?: boolean;
  cost?: string | number;
  hidden?: boolean;
  beta?: boolean;
  elementCertified?: boolean;
  longestRunning?: boolean;
  hasIssues?: boolean;
  extype?: string;
  detectionReason?: string;
  recommendedReason?: unknown;
  possibleBanwave?: boolean;
  slug?: { logo?: string; owner?: string; fullDescription?: string } | string;
};

type Plat = "Windows" | "Android" | "iOS" | "Mac";
const PLATS: { id: Plat; label: string; icon: typeof Monitor }[] = [
  { id: "Windows", label: "Windows PC", icon: Monitor },
  { id: "Android", label: "Android", icon: Smartphone },
  { id: "iOS", label: "iPhone / iPad", icon: Tablet },
  { id: "Mac", label: "Mac", icon: Apple },
];

// Maps the raw `extype` (w/a/i/m + executor/external) to a platform + internal/external.
function execPlat(e: Executor): { plat: Plat; external: boolean } {
  const t = (e.extype || "").toLowerCase();
  const p = (e.platform || "").toLowerCase();
  let plat: Plat = "Windows";
  if (t.startsWith("a") || p.includes("android")) plat = "Android";
  else if (t.startsWith("i") || p.includes("ios")) plat = "iOS";
  else if (t.startsWith("m") || p.includes("mac")) plat = "Mac";
  return { plat, external: t.includes("external") };
}

// The visitor's own device, so the page opens on the executors that run on it.
function detectPlat(): Plat {
  if (typeof navigator === "undefined") return "Windows";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1)) return "iOS";
  if (/macintosh|mac os x/i.test(ua)) return "Mac";
  return "Windows";
}

const score = (e: Executor) => e.suncPercentage ?? e.uncPercentage ?? 0;
// working first, then undetected, then highest function support
const rank = (a: Executor, b: Executor) =>
  Number(b.updateStatus === true) - Number(a.updateStatus === true) ||
  Number(a.detected === true) - Number(b.detected === true) ||
  score(b) - score(a);

type InjectVersions = {
  Windows?: { Version: string; Date: string };
  Macintosh?: { Version: string; Date: string };
};

type InjectCheat = {
  Identifier?: string;
  Name?: string;
  Tags?: Record<string, { Rank?: string; Parent?: string }>;
  Attributes?: Record<string, { Score?: number; Type?: string; Access?: string; PricingModel?: string[]; ReleaseDate?: string }>;
  Cost?: Record<string, string>;
  Links?: Record<string, { Discord?: string; Purchase?: string; Website?: string }>;
  Platforms?: Record<string, {
    Detection?: { Raw?: number; Readable?: string; Tracked?: boolean };
    Versions?: { Software?: string | null; Roblox?: string | null };
  }>;
};

const CACHE_KEY = "executors-online-cache-v2";
const CACHE_TTL = 30_000;
const POLL_INTERVAL = 60_000;
const IQ = 'loadstring(game:HttpGet("https://raw.githubusercontent.com/checkurasshole/Script/main/IQ"))()';

function cacheLogo(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.includes("wsrv.nl")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=80&h=80&fit=cover&output=webp&q=82&maxage=1y`;
}

function parseExecutorDate(value?: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/\s+at\s+/i, " ").replace(/\s+UTC$/i, " UTC");
  const direct = new Date(cleaned).getTime();
  if (!Number.isNaN(direct)) return direct;
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)\s*UTC$/i);
  if (!match) return null;
  const [, month, day, year, hourRaw, minute, period] = match;
  let hour = Number(hourRaw) % 12;
  if (period.toUpperCase() === "PM") hour += 12;
  return Date.UTC(Number(year), Number(month) - 1, Number(day), hour, Number(minute));
}

function normalizeExternalUrl(url?: string): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(discord\.gg|www\.|[a-z0-9-]+\.)/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function formatRelative(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function formatAbsolute(ts: number): string {
  try {
    return new Date(ts).toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  } catch { return new Date(ts).toString(); }
}

function UncBar({ value, label }: { value: number; label: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setW(value));
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const color = value >= 95 ? "bg-success" : value >= 80 ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-10 shrink-0 text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`${color} h-1.5 rounded-full transition-[width] duration-700 ease-out`} style={{ width: `${Math.max(0, Math.min(100, w))}%` }} />
      </div>
      <span className="w-9 text-right tabular-nums text-muted-foreground">{value}%</span>
    </div>
  );
}

function StatusPill({ working }: { working: boolean }) {
  const { t } = useTranslation();
  return working ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" /> {t("Working")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">
      <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> {t("Patched")}
    </span>
  );
}

function PricePill({ exec }: { exec: Executor }) {
  const { t } = useTranslation();
  return exec.free ? (
    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{t("Free")}</span>
  ) : (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground" data-no-translate>
      {t("Paid")}{exec.cost ? ` · ${String(exec.cost)}` : ""}
    </span>
  );
}

const FAQS = [
  {
    q: "What is the best Roblox executor in 2026?",
    a: "The 'best' executor changes weekly because Roblox patches frequently. Right now, top community picks include Delta, Solara, Xeno, Codex and Wave on Windows, and Delta and Hydrogen on iOS/Mac. The live list above shows real-time UNC/SUNC scores and Working vs Patched status from executors.online and inject.today, so you can always see which one is actually working today.",
  },
  {
    q: "Are Roblox executors safe to use?",
    a: "Reputable executors (Delta, Solara, Xeno, Codex, Wave) don't contain malware, but Roblox can issue account bans for using them. Use an alt account, never run executors as admin, and only download from the official website or Discord links shown on this page — most malware spreads through fake YouTube downloads.",
  },
  {
    q: "What does UNC and SUNC mean for Roblox executors?",
    a: "UNC (Unified Naming Convention) and SUNC (Secure UNC) are standardized benchmarks that measure how many script functions an executor supports. 95%+ UNC means almost every public script will run; below 80% means many modern scripts will silently fail.",
  },
  {
    q: "What Roblox executors work on Mac / iOS / Android?",
    a: "Delta is the most popular cross-platform executor with native iOS, Android and Mac builds. Hydrogen is another solid Mac/iOS option. Windows still has the widest ecosystem (Solara, Xeno, Codex, Wave, Severe, Volt).",
  },
  {
    q: "Why is my executor showing as Patched?",
    a: "Roblox pushes a new client version every few weeks. When the executor's last update is older than the current Roblox version (shown at the top of this page), it's almost certainly patched and you need to wait for the developer to push an update.",
  },
  {
    q: "Where do I get free working scripts to use with my executor?",
    a: "Pair any executor on this page with our free script hub — every script lists the games it works in. Start at /scripts or paste our universal script from the steps above.",
  },
];

export default function Executors() {
  const { t } = useTranslation();
  const [executors, setExecutors] = useState<Executor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [plat, setPlat] = useState<Plat>(() => detectPlat());
  const [search, setSearch] = useState("");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");
  const [workingOnly, setWorkingOnly] = useState(false);
  const [selected, setSelected] = useState<Executor | null>(null);
  const [copied, setCopied] = useState(false);

  const [versions, setVersions] = useState<InjectVersions | null>(null);
  const [cheats, setCheats] = useState<Record<string, InjectCheat> | null>(null);

  const load = async (force = false) => {
    if (!force) {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { fetchedAt: number; data: Executor[] };
          if (Date.now() - parsed.fetchedAt < CACHE_TTL) {
            setExecutors(parsed.data);
            setFetchedAt(parsed.fetchedAt);
            setLoading(false);
            return;
          }
        }
      } catch { /* ignore */ }
    }
    try {
      const { data, error: fnError } = await supabase.functions.invoke("executors-online");
      if (fnError) throw fnError;
      if (!data?.ok || !Array.isArray(data.data)) throw new Error(data?.error || "Invalid response");
      const list = data.data as Executor[];
      setExecutors(list);
      setFetchedAt(data.fetchedAt || Date.now());
      setError(null);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), data: list })); } catch { /* ignore */ }
    } catch (e: any) {
      setError(e?.message || "Failed to load executors");
    } finally {
      setLoading(false);
    }
  };

  const loadInject = async () => {
    try {
      const base = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/inject-today`;
      const [v, c] = await Promise.all([
        fetch(`${base}?part=versions`).then((r) => r.json()).catch(() => null),
        fetch(`${base}?part=cheats`).then((r) => r.json()).catch(() => null),
      ]);
      if (v?.ok) setVersions(v.data as InjectVersions);
      if (c?.ok) setCheats(c.data as Record<string, InjectCheat>);
    } catch { /* optional section */ }
  };

  useEffect(() => {
    load();
    loadInject();
    const id = setInterval(() => load(true), POLL_INTERVAL);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 20_000);
    return () => clearInterval(id);
  }, []);

  // everything for the chosen device (hidden entries never shown), best first
  const forPlat = useMemo(() => executors.filter((e) => !e.hidden && execPlat(e).plat === plat).sort(rank), [executors, plat]);
  const counts = useMemo(() => {
    const c: Record<Plat, number> = { Windows: 0, Android: 0, iOS: 0, Mac: 0 };
    for (const e of executors) if (!e.hidden && e.updateStatus === true) c[execPlat(e).plat]++;
    return c;
  }, [executors]);

  // our pick: best working free + best working paid internal executor for this device
  const picks = useMemo(() => {
    const ok = forPlat.filter((e) => e.updateStatus === true && !e.hasIssues && !execPlat(e).external);
    return { free: ok.find((e) => e.free), paid: ok.find((e) => !e.free) };
  }, [forPlat]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return forPlat.filter((e) => {
      if (priceFilter === "free" && !e.free) return false;
      if (priceFilter === "paid" && e.free) return false;
      if (workingOnly && e.updateStatus !== true) return false;
      if (q && !e.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [forPlat, search, priceFilter, workingOnly]);
  const internal = visible.filter((e) => !execPlat(e).external);
  const external = visible.filter((e) => execPlat(e).external);
  const resetFilters = () => { setSearch(""); setPriceFilter("all"); setWorkingOnly(false); };

  // Inject.Today entries not already covered by executors.online (Windows only, Reputable+)
  const injectExtras = useMemo(() => {
    if (!cheats) return [] as Array<{ name: string; cheat: InjectCheat }>;
    const existing = new Set(executors.map((e) => e.title.toLowerCase().trim()));
    return Object.entries(cheats)
      .map(([name, cheat]) => ({ name, cheat }))
      .filter(({ name, cheat }) => {
        const display = (cheat.Name || name).toLowerCase().trim();
        if (existing.has(display)) return false;
        const r = cheat.Tags?.Windows?.Rank?.toLowerCase() || "";
        return r === "reputable" || r === "trusted" || r === "verified";
      })
      .sort((a, b) => (b.cheat.Attributes?.Windows?.Score ?? 0) - (a.cheat.Attributes?.Windows?.Score ?? 0))
      .slice(0, 24);
  }, [cheats, executors]);

  const jsonLd = useMemo(() => {
    const all = executors.filter((e) => !e.hidden);
    const itemList = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Live Roblox Executors Status 2026",
      description: "Live list of Roblox script executors with working status, UNC/SUNC scores and platform support. Includes Delta, Solara, Xeno, Codex, Wave and more.",
      numberOfItems: all.length,
      itemListElement: all.slice(0, 50).map((exec, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "SoftwareApplication",
          name: exec.title,
          operatingSystem: exec.platform || "Unknown",
          applicationCategory: "GameApplication",
          softwareVersion: exec.version || undefined,
        },
      })),
    };
    const faq = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    };
    return [itemList, faq];
  }, [executors]);

  const copyScript = () => {
    try { navigator.clipboard.writeText(IQ); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const platLabel = PLATS.find((p) => p.id === plat)!.label;

  return (
    <Layout>
      <SEOHead
        title="Roblox Executors List 2026 — Delta, Solara, Xeno, Codex Working Status | ComboWick"
        description="Live Roblox executor list: Delta, Solara, Xeno, Codex, Wave, Hydrogen & more. Real-time working/patched status, UNC & SUNC scores, free vs paid, Windows / Mac / iOS / Android. Updated every minute."
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Executors", url: "/executors" }]}
        jsonLd={jsonLd}
      />
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="mb-8 text-center">
            <h1 className="mb-3 font-heading text-3xl font-bold sm:text-5xl">
              {t("Roblox Executors")} <span className="text-primary">2026</span>
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
              {t("Find an executor that works on your device right now, then run our script in 3 easy steps.")}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-success">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>
                {t("Live status")}{fetchedAt ? ` · ${formatRelative(fetchedAt, Date.now())}` : ""}
              </span>
              {versions?.Windows && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-muted-foreground">
                  {t("Current Roblox")} <code className="text-foreground">{versions.Windows.Version}</code>
                </span>
              )}
              <button onClick={() => load(true)} disabled={loading} className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-muted-foreground hover:text-foreground disabled:opacity-50">
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> {t("Refresh")}
              </button>
            </div>
          </div>

          {/* Step 1: device */}
          <div className="mb-6">
            <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("What are you playing on?")}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PLATS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setPlat(id)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${plat === id ? "border-primary bg-primary/15 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]" : "border-border/60 bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t(label)}</span>
                  {counts[id] > 0 && <span className="rounded-full bg-success/15 px-1.5 text-[10px] text-success" title={t("Working right now")}>{counts[id]}</span>}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">{t("Couldn't reach the live status feed.")}</p>
                <p className="text-xs opacity-80">{error}</p>
              </div>
            </div>
          )}

          {/* Our pick for this device */}
          {(picks.free || picks.paid) && (
            <div className="mb-8">
              <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold">
                <Award className="h-5 w-5 text-primary" /> {t("Best for")} {t(platLabel)}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {([["free", picks.free, "Best free pick"], ["paid", picks.paid, "Best paid pick"]] as const).map(([k, e, title]) => e && (
                  <PickCard key={k} exec={e} title={title} onOpen={() => setSelected(e)} />
                ))}
              </div>
            </div>
          )}

          {/* How to run our script */}
          <div className="mb-10 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
            <h2 className="mb-4 font-heading text-lg font-bold">{t("How to run our script")}</h2>
            <ol className="grid gap-4 sm:grid-cols-3">
              {[
                { n: 1, title: "Get a working executor", text: "Pick one marked Working above. Only download from the official website or Discord link on this page." },
                { n: 2, title: "Open Roblox and join a game", text: "Open your executor, then attach or inject it while you're in the game." },
                { n: 3, title: "Paste our script and run it", text: "Copy the script below, paste it in the executor and press Execute. Get a free key when it asks." },
              ].map((s) => (
                <li key={s.n} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-primary-foreground">{s.n}</span>
                  <div>
                    <p className="text-sm font-semibold">{t(s.title)}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t(s.text)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-border/60 bg-background/70 px-3 py-2.5 font-mono text-[11px] text-primary" data-ltr>{IQ}</code>
              <Button onClick={copyScript} className="shrink-0 font-bold">
                {copied ? <><Check className="mr-1.5 h-4 w-4" /> {t("Copied!")}</> : <><Copy className="mr-1.5 h-4 w-4" /> {t("Copy Script")}</>}
              </Button>
              <Button asChild variant="outline" className="shrink-0 border-primary/40 font-bold">
                <Link to="/keys"><KeyRound className="mr-1.5 h-4 w-4" /> {t("Get Free Key")}</Link>
              </Button>
            </div>
          </div>

          {/* All executors for this device */}
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-heading text-lg font-bold">{t("All executors for")} {t(platLabel)}</h2>
            <span className="text-xs text-muted-foreground">{t("Working ones are listed first. Tap one for details.")}</span>
          </div>
          <div className="sticky top-[64px] z-20 mb-4 rounded-xl border border-border/50 bg-card/80 p-2.5 backdrop-blur-md">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("Search executors")}
                  className="h-9 w-full rounded-lg border border-border/60 bg-background/60 pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60"
                />
                {search && (
                  <button onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg border border-border/60 bg-background/40 p-0.5">
                  {(["all", "free", "paid"] as const).map((opt) => (
                    <button key={opt} onClick={() => setPriceFilter(opt)} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${priceFilter === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      {t(opt === "all" ? "All" : opt === "free" ? "Free" : "Paid")}
                    </button>
                  ))}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  <input type="checkbox" checked={workingOnly} onChange={(e) => setWorkingOnly(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
                  {t("Working only")}
                </label>
              </div>
            </div>
          </div>

          {loading && executors.length === 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[92px] animate-pulse rounded-xl border border-border/50 bg-card" />)}
            </div>
          ) : internal.length === 0 && external.length === 0 ? (
            <div className="rounded-xl border border-border/50 bg-card/40 py-14 text-center">
              <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-foreground">{t("No executors match your filters")}</p>
              <Button size="sm" variant="outline" className="mt-4 h-8" onClick={resetFilters}>{t("Reset filters")}</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {internal.map((e) => <ExecRow key={e._id} exec={e} onOpen={() => setSelected(e)} />)}
              </div>
              {external.length > 0 && (
                <details className="group mt-6 rounded-xl border border-border/50 bg-card/30">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold">
                    <span className="flex items-center gap-2"><Boxes className="h-4 w-4 text-primary" /> {t("External executors")} <span className="text-xs font-normal text-muted-foreground">({external.length})</span></span>
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-4 pb-4">
                    <p className="mb-3 text-xs text-muted-foreground">{t("Run outside Roblox. Harder to detect, but usually paid and for advanced users.")}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {external.map((e) => <ExecRow key={e._id} exec={e} onOpen={() => setSelected(e)} />)}
                    </div>
                  </div>
                </details>
              )}
            </>
          )}

          {/* What the labels mean */}
          <div className="mt-8 grid gap-2 rounded-xl border border-border/50 bg-card/30 p-4 text-xs text-muted-foreground sm:grid-cols-3">
            <p><span className="font-semibold text-success">{t("Working")}</span> — {t("updated for the current Roblox version. Safe to try.")}</p>
            <p><span className="font-semibold text-destructive">{t("Patched")}</span> — {t("broken by the last Roblox update. Wait for the developer to update it.")}</p>
            <p><span className="font-semibold text-foreground">sUNC</span> — {t("how many script functions it supports. 95% or more runs almost every script.")}</p>
          </div>

          {/* Advanced: more tools from inject.today (Windows) */}
          {plat === "Windows" && injectExtras.length > 0 && (
            <details className="group mt-4 rounded-xl border border-border/50 bg-card/30">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {t("More tools for advanced users")} <span className="text-xs font-normal text-muted-foreground">({injectExtras.length})</span></span>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-3">
                {injectExtras.map(({ name, cheat }) => {
                  const display = cheat.Name || name;
                  const winAttr = cheat.Attributes?.Windows;
                  const winPlat = cheat.Platforms?.Windows;
                  const winLinks = cheat.Links?.Windows;
                  const cost = cheat.Cost?.Windows || winAttr?.PricingModel?.join(", ") || "—";
                  const det = winPlat?.Detection?.Readable;
                  const site = normalizeExternalUrl(winLinks?.Website || winLinks?.Purchase || winLinks?.Discord);
                  return (
                    <article key={name} className="min-w-0 rounded-lg border border-border/50 bg-card p-3 text-xs">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold">{display}</h3>
                        {typeof winAttr?.Score === "number" && <span className="shrink-0 font-mono text-[10px] text-primary">{winAttr.Score}/100</span>}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">{[winAttr?.Type, cost, det].filter(Boolean).join(" · ")}</p>
                      {site && (
                        <a href={site} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" /> {t("Website")}
                        </a>
                      )}
                    </article>
                  );
                })}
              </div>
            </details>
          )}

          {/* FAQ (kept on the page for search engines, folded for readers) */}
          <div className="mx-auto mt-12 max-w-3xl">
            <h2 className="mb-4 text-center font-heading text-2xl font-bold">{t("Executor FAQ")}</h2>
            <div className="space-y-2">
              {FAQS.map((f) => (
                <details key={f.q} className="group rounded-xl border border-border/50 bg-card/30">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold">
                    {f.q}
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-muted-foreground">
            <Shield className="mr-1 inline h-3 w-3" />
            {t("Live data from")}{" "}
            <a href="https://executors.online" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">executors.online</a>
            {" & "}
            <a href="https://inject.today" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">inject.today</a>
          </div>
        </div>
      </section>

      <ExecutorModal exec={selected} onClose={() => setSelected(null)} />
    </Layout>
  );
}

function Logo({ exec, size }: { exec: Executor; size: string }) {
  const logo = typeof exec.slug === "object" ? exec.slug?.logo : undefined;
  return logo ? (
    <img
      src={cacheLogo(logo)}
      alt={`${exec.title} Roblox executor logo`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
      className={`${size} shrink-0 rounded-lg bg-muted object-cover`}
    />
  ) : (
    <div className={`${size} flex shrink-0 items-center justify-center rounded-lg bg-muted font-heading text-sm font-bold text-muted-foreground`}>{exec.title.slice(0, 1)}</div>
  );
}

function PickCard({ exec, title, onOpen }: { exec: Executor; title: string; onOpen: () => void }) {
  const { t } = useTranslation();
  const get = normalizeExternalUrl(exec.websitelink) || normalizeExternalUrl(exec.purchaselink) || normalizeExternalUrl(exec.discordlink);
  const s = score(exec);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-b from-primary/10 to-card p-4">
      <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">{t(title)}</span>
      <button onClick={onOpen} className="flex min-w-0 items-center gap-3 text-left">
        <Logo exec={exec} size="h-12 w-12" />
        <div className="min-w-0">
          <h3 className="truncate font-heading text-xl font-bold">{exec.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusPill working={exec.updateStatus === true} />
            <PricePill exec={exec} />
            {exec.keysystem && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">{t("Key system")}</span>}
          </div>
        </div>
      </button>
      {s > 0 && <div className="mt-3"><UncBar value={s} label={exec.suncPercentage != null ? "sUNC" : "UNC"} /></div>}
      {get && (
        <a href={get} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
          <Download className="h-4 w-4" /> {t("Download")} {exec.title}
        </a>
      )}
    </div>
  );
}

function ExecRow({ exec, onOpen }: { exec: Executor; onOpen: () => void }) {
  const { t } = useTranslation();
  const working = exec.updateStatus === true;
  const get = normalizeExternalUrl(exec.websitelink) || normalizeExternalUrl(exec.purchaselink);
  const discord = normalizeExternalUrl(exec.discordlink);
  const s = score(exec);
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onOpen(); } }}
      className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border bg-card/60 p-3 transition-colors hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${working ? "border-border/50" : "border-border/30 opacity-70"}`}
    >
      <Logo exec={exec} size="h-10 w-10" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-sm font-semibold">{exec.title}</h3>
          {exec.version && <span className="shrink-0 text-[10px] text-muted-foreground">v{exec.version.replace(/^v/i, "")}</span>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <StatusPill working={working} />
          <PricePill exec={exec} />
          {s > 0 && <span className={`text-[11px] font-semibold tabular-nums ${s >= 95 ? "text-success" : s >= 80 ? "text-warning" : "text-destructive"}`}>{s}% {exec.suncPercentage != null ? "sUNC" : "UNC"}</span>}
          {exec.detected && <span className="text-[11px] font-semibold text-destructive">{t("Detected")}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {discord && (
          <a href={discord} onClick={(ev) => ev.stopPropagation()} target="_blank" rel="noopener noreferrer" title="Discord" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary/40 hover:text-primary">
            <MessageCircle className="h-4 w-4" />
          </a>
        )}
        {get && (
          <a href={get} onClick={(ev) => ev.stopPropagation()} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary/15 px-2.5 text-xs font-bold text-primary hover:bg-primary/25">
            <Download className="h-3.5 w-3.5" /> {t("Get")}
          </a>
        )}
      </div>
    </article>
  );
}

function StatChip({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "good" | "bad" | "warn" }) {
  const toneCls = tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : tone === "warn" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className={`mt-1 text-sm font-semibold ${toneCls}`}>{value}</div>
    </div>
  );
}

function ExecutorModal({ exec, onClose }: { exec: Executor | null; onClose: () => void }) {
  const { t } = useTranslation();
  if (!exec) return null;
  const working = exec.updateStatus === true;
  const detected = exec.detected === true;
  const website = normalizeExternalUrl(exec.websitelink);
  const discord = normalizeExternalUrl(exec.discordlink);
  const purchase = normalizeExternalUrl(exec.purchaselink);
  const { plat, external } = execPlat(exec);
  const rawDesc = typeof exec.slug === "object" ? exec.slug?.fullDescription : undefined;
  const description = rawDesc && !/no description currently available/i.test(rawDesc) ? rawDesc.trim() : undefined;
  const updatedTs = parseExecutorDate(exec.updatedDate);
  const yes = t("Yes"), no = t("No");

  return (
    <Dialog open={!!exec} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <div className="flex items-start gap-3">
          <Logo exec={exec} size="h-14 w-14" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-2xl font-bold leading-tight">{exec.title}</h2>
              {exec.version && <span className="text-xs text-muted-foreground">v{exec.version.replace(/^v/i, "")}</span>}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <StatusPill working={working} />
              <PricePill exec={exec} />
              {exec.possibleBanwave && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">{t("Banwave risk")}</span>}
            </div>
          </div>
        </div>

        {(typeof exec.uncPercentage === "number" || typeof exec.suncPercentage === "number") && (
          <div className="mt-4 space-y-2 rounded-lg border border-border/50 bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("Script support")}</div>
            {typeof exec.uncPercentage === "number" && <UncBar value={exec.uncPercentage} label="UNC" />}
            {typeof exec.suncPercentage === "number" && <UncBar value={exec.suncPercentage} label="sUNC" />}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatChip icon={<Zap className="h-3 w-3" />} label={t("Status")} value={t(working ? "Working" : "Patched")} tone={working ? "good" : "bad"} />
          <StatChip icon={<Shield className="h-3 w-3" />} label={t("Detection")} value={t(detected ? "Detected" : "Undetected")} tone={detected ? "bad" : "good"} />
          <StatChip icon={<KeyRound className="h-3 w-3" />} label={t("Key system")} value={exec.keysystem ? yes : no} tone={exec.keysystem ? "warn" : "good"} />
          <StatChip icon={<Code2 className="h-3 w-3" />} label="Decompiler" value={exec.decompiler ? yes : no} />
          <StatChip icon={<Layers className="h-3 w-3" />} label="Multi-Inject" value={exec.multiInject ? yes : no} />
          <StatChip icon={<Cpu className="h-3 w-3" />} label={t("Type")} value={t(external ? "External" : "Internal")} />
        </div>

        <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
          <div className="flex justify-between gap-2"><span>{t("Device")}</span><span className="text-foreground">{t(PLATS.find((p) => p.id === plat)!.label)}</span></div>
          <div className="flex justify-between gap-2"><span>{t("Roblox version")}</span><span className="truncate text-foreground">{exec.rbxversion ? String(exec.rbxversion) : "—"}</span></div>
          <div className="flex justify-between gap-2"><span>{t("Last updated")}</span><span className="text-foreground">{updatedTs ? `${formatRelative(updatedTs, Date.now())} · ${formatAbsolute(updatedTs)}` : "—"}</span></div>
          {exec.detectionReason && <div className="flex justify-between gap-2"><span>{t("Detection note")}</span><span className="text-right text-foreground">{exec.detectionReason}</span></div>}
          {description && <div className="whitespace-pre-line rounded-lg border border-primary/30 bg-primary/5 p-3 text-foreground">{description}</div>}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {website && (
            <a href={website} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-[8rem] flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Download className="h-4 w-4" /> {t("Download")}
            </a>
          )}
          {discord && (
            <a href={discord} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-[8rem] flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:border-primary/50 hover:text-primary">
              <MessageCircle className="h-4 w-4" /> Discord
            </a>
          )}
          {purchase && (
            <a href={purchase} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-[8rem] flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:border-primary/50 hover:text-primary">
              <ShoppingCart className="h-4 w-4" /> {t("Buy")}
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
