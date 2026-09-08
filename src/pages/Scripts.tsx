import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, SlidersHorizontal, Crown, ArrowRight } from "lucide-react";
import { CATEGORIES } from "@/lib/scripts-data";
import { useSearchScripts } from "@/hooks/useScripts";
import { ScriptCard } from "@/components/ScriptCard";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";
import { GameThumbnail } from "@/components/GameThumbnail";
import { Skeleton } from "@/components/ui/skeleton";
import { AdSlot } from "@/components/AdSlot";

export default function Scripts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "All");

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setCategory(searchParams.get("category") ?? "All");
  }, [searchParams]);

  // Press "/" to focus the search box (skip when typing in another input)
  const searchRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Monetag Direct Link — fires on user clicks inside the page,
  // max 2 times then a 30-minute cooldown so it isn't annoying.
  const DIRECT_LINK_URL = "https://omg10.com/4/11035707";
  const STORAGE_KEY = "scripts_dl_state";
  const MAX_CLICKS = 2;
  const COOLDOWN_MS = 15 * 1000;
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Only count primary-button clicks on real interactive elements
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest("a, button, [role='button']");
      if (!interactive) return;
      // Skip clicks inside form fields / search input
      if ((target as HTMLElement).closest("input, textarea, select")) return;

      let state: { count: number; firstAt: number; cooldownUntil: number } = { count: 0, firstAt: 0, cooldownUntil: 0 };
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) state = JSON.parse(raw);
      } catch {}
      const now = Date.now();
      if (state.cooldownUntil && now < state.cooldownUntil) return;
      if (state.cooldownUntil && now >= state.cooldownUntil) {
        state = { count: 0, firstAt: 0, cooldownUntil: 0 };
      }

      // Open ad in a background tab — does not interrupt the user's navigation
      try { window.open(DIRECT_LINK_URL, "_blank", "noopener,noreferrer"); } catch {}

      const newCount = state.count + 1;
      const next = newCount >= MAX_CLICKS
        ? { count: 0, firstAt: 0, cooldownUntil: now + COOLDOWN_MS }
        : { count: newCount, firstAt: state.firstAt || now, cooldownUntil: 0 };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  const { data: results = [], isLoading } = useSearchScripts(query, category);
  // Always-fetched (cached 15min, near zero cost) — used to surface a featured/sponsored
  // paid script even when the user is searching/filtering. Today the only paid script
  // is "Jurassic Blocky"; this auto-promotes whatever paid script exists.
  const { data: allScripts = [] } = useSearchScripts("", "All");
  const featured = useMemo(
    () => allScripts.find((s) => s.is_paid) || null,
    [allScripts]
  );
  const isDefaultView = !query && category === "All";

  const handleSearch = (q: string) => {
    setQuery(q);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category !== "All") params.set("category", category);
    setSearchParams(params, { replace: true });
  };

  const handleCategory = (cat: string) => {
    setCategory(cat);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (cat !== "All") params.set("category", cat);
    setSearchParams(params, { replace: true });
  };

  return (
    <Layout>
      <SEOHead
        title="Free Roblox Scripts — Auto Farm, ESP, Aimbot | ComboWick"
        description="100+ verified free Roblox Lua scripts. Auto-farm, ESP, aimbot, fly and teleport for Blox Fruits, Pet Sim, Arsenal and more."
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Scripts", url: "/scripts" },
        ]}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Free Roblox Scripts",
          description: "Browse verified Roblox Lua scripts. Auto-farm, ESP, aimbot, and utility scripts updated daily.",
          url: "https://combowick.com/scripts",
          isPartOf: { "@type": "WebSite", name: "ComboWick", url: "https://combowick.com" },
        }}
      />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-heading" style={{ textWrap: "balance" as any }}>
            Free Roblox Scripts
          </h1>
          <p className="mt-2 text-muted-foreground">
            Browse verified Roblox scripts by COMBO_WICK. Copy and execute instantly.
          </p>
          {/* AI-retrieval paragraph */}
          <p className="mt-2 text-xs text-muted-foreground max-w-2xl">
            ComboWick provides free, verified Roblox Lua scripts for popular games including Blox Fruits, Pet Simulator X, Arsenal, Brookhaven, and more. All scripts are tested for safety, updated daily, and can be copied instantly. Use with any compatible executor like Velocity, Delta, or Codex.
          </p>
          {/* SEO landing page links — internal crawl path for high-volume game keywords */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground/70 mr-1 self-center">Popular:</span>
            <Link to="/games/blox-fruits" className="text-xs px-3 py-1 rounded-full bg-bronze/10 border border-bronze/30 text-bronze-light hover:bg-bronze/20 transition-colors">Blox Fruits Script</Link>
            <Link to="/games/arsenal" className="text-xs px-3 py-1 rounded-full bg-bronze/10 border border-bronze/30 text-bronze-light hover:bg-bronze/20 transition-colors">Arsenal Script</Link>
            <Link to="/games/pet-simulator" className="text-xs px-3 py-1 rounded-full bg-bronze/10 border border-bronze/30 text-bronze-light hover:bg-bronze/20 transition-colors">Pet Simulator Script</Link>
            <Link to="/games/jurassic-blocky" className="text-xs px-3 py-1 rounded-full bg-bronze/10 border border-bronze/30 text-bronze-light hover:bg-bronze/20 transition-colors">Jurassic Blocky Script</Link>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-56 shrink-0">
            <div className="sticky top-20">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Filter by Category</span>
              </div>
              <ul className="flex flex-col gap-1">
                {CATEGORIES.map((cat) => (
                  <li key={cat}>
                    <button
                      onClick={() => handleCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        category === cat
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {/* Featured / Sponsored slot — promotes the only paid script (Jurassic Blocky)
                without breaking the listing for filtered/search views. */}
            {featured && isDefaultView && (
              <Link
                to="/premium-keys"
                className="group relative block mb-6 overflow-hidden rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-card to-primary/10 p-4 sm:p-5 hover:border-yellow-500/60 transition-all"
              >
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-[10px] font-bold uppercase tracking-wider text-yellow-400">
                  <Crown className="h-3 w-3" /> Featured
                </div>
                <div className="flex items-center gap-4">
                  <GameThumbnail gameName={featured.game} universeId={(featured as any).game_universe_id} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider mb-1">Premium • {featured.game}</p>
                    <h2 className="font-heading font-bold text-base sm:text-lg leading-tight group-hover:text-primary transition-colors truncate">
                      {featured.title}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{featured.description}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-primary whitespace-nowrap">
                    Unlock <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            )}

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search scripts, games, or tags... (press / )"
                className="w-full rounded-lg border border-border bg-card pl-10 pr-12 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <kbd className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center justify-center h-6 px-1.5 rounded border border-border bg-secondary/60 text-[10px] text-muted-foreground font-mono pointer-events-none">
                /
              </kbd>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {isLoading ? "Loading..." : `${results.length} script${results.length !== 1 ? "s" : ""} found`}
              {query && <span> for &ldquo;{query}&rdquo;</span>}
              {category !== "All" && <span> in {category}</span>}
            </p>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <Skeleton className="h-32 w-full rounded-md" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-12 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                ))}
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {results.slice(0, 6).map((script) => (
                    <ScriptCard key={script.id} script={script} />
                  ))}
                </div>
                {results.length > 6 && (
                  <AdSlot slot="3333333333" format="auto" responsive minHeight={250} />
                )}
                {results.length > 6 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {results.slice(6).map((script) => (
                      <ScriptCard key={script.id} script={script} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-muted-foreground text-lg font-medium">No scripts found</p>
                <p className="text-muted-foreground text-sm mt-2">Try a different search term or category.</p>
                <button
                  onClick={() => {
                    setQuery("");
                    setCategory("All");
                    setSearchParams({});
                  }}
                  className="mt-4 text-primary text-sm hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
}
