import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { DiscordSignInButton } from "@/components/DiscordSignInButton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/translation-context";
import { callRequests, fmtCount, type FoundGame, type ScriptRequest } from "@/lib/script-requests";
import { Lightbulb, Search, Loader2, ThumbsUp, Users, Key, ChevronRight } from "lucide-react";

/** Compact "request a script" box for the key page: top requests + inline search/request/vote. */
export function RequestWidget() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [top, setTop] = useState<ScriptRequest[]>([]);
  const [myVotes, setMyVotes] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<FoundGame[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | number | null>(null);
  const [needLogin, setNeedLogin] = useState(false);

  const load = useCallback(async () => {
    const j = await callRequests({ action: "list" });
    if (j?.success) { setTop((j.requests as ScriptRequest[]).filter((r) => r.status === "requested").slice(0, 3)); setMyVotes(j.my_votes ?? []); }
  }, []);
  useEffect(() => { if (!authLoading) load(); }, [authLoading, user?.id, load]);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true); setFound(null);
    const j = await callRequests({ action: "lookup", query });
    setFound(j?.success ? (j.games as FoundGame[]).slice(0, 4) : []);
    setSearching(false);
  };
  const request = async (g: FoundGame) => {
    if (!user) { setNeedLogin(true); return; }
    setBusy(g.place_id);
    const j = await callRequests({ action: "request", place_id: g.place_id });
    setBusy(null);
    if (j?.success) { toast({ title: j.existed ? t("Already requested, your vote was added! 👍") : t("Request sent! 🎉") }); setFound(null); setQuery(""); load(); }
    else toast({ variant: j?.covered ? "default" : "destructive", title: j?.covered ? t("Already supported ✅") : t("Couldn't send the request"), description: j?.error });
  };
  const vote = async (r: ScriptRequest) => {
    if (!user) { setNeedLogin(true); return; }
    setBusy(r.id);
    const j = await callRequests({ action: "vote", id: r.id });
    setBusy(null);
    if (j?.success) {
      setTop((xs) => xs.map((x) => (x.id === r.id ? { ...x, vote_count: j.vote_count } : x)));
      setMyVotes((v) => (j.voted ? [...v, r.id] : v.filter((x) => x !== r.id)));
    } else toast({ variant: "destructive", title: j?.error ?? t("Something went wrong") });
  };

  const thumb = (src: string | null) => (src ? <img src={src} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" loading="lazy" /> : <div className="h-9 w-9 shrink-0 rounded-md bg-secondary" />);

  return (
    <div className="cw-glow" style={{ "--glow": "268 85% 66%", "--glow-radius": "0.75rem", "--glow-speed": "2.6s", overflow: "clip" } as React.CSSProperties}>
    <Card className="relative rounded-[calc(0.75rem-1.5px)] border-0 bg-gradient-to-br from-violet-500/15 via-card to-card">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
            <span className="absolute inset-0 animate-ping rounded-full bg-violet-500/20" />
            <Lightbulb className="relative h-6 w-6 text-violet-300" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-base font-bold leading-tight sm:text-lg">
              <span>{t("Don't see your game? Request a script")}</span>
              <span className="rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">{t("New")}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{t("Request any Roblox game or vote for one. The most-voted games get made first.")}</p>
          </div>
        </div>

        <form onSubmit={search} className="flex gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Game name or Roblox link")} maxLength={200} className="h-11 min-w-0 border-violet-400/50 bg-black/50 text-base placeholder:text-muted-foreground/80 focus-visible:ring-violet-400 sm:text-sm" />
          <Button type="submit" disabled={searching || query.trim().length < 2} className="h-11 shrink-0 gap-1.5 bg-violet-600 px-4 font-semibold text-white hover:bg-violet-500 disabled:opacity-60">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="hidden sm:inline">{t("Search")}</span>
          </Button>
        </form>

        {found && found.length === 0 && <p className="text-xs text-muted-foreground">{t("No games found. Try the exact name or paste the game link.")}</p>}
        {found && found.length > 0 && (
          <div className="divide-y divide-border/50 rounded-lg border border-border/50">
            {found.map((g) => (
              <div key={g.universe_id} className="flex items-center gap-2.5 p-2">
                {thumb(g.icon_url)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{g.name}</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Users className="h-3 w-3" />{fmtCount(g.playing)}</p>
                </div>
                {g.covered ? (
                  <span className="shrink-0 rounded-full bg-green-500/15 px-2 py-1 text-[11px] font-semibold text-green-300">✅ {t("Supported")}</span>
                ) : (
                  <Button size="sm" onClick={() => request(g)} disabled={busy === g.place_id || (g.request ? g.request.status !== "requested" : false)} className="h-8 shrink-0 gap-1">
                    {busy === g.place_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                    {g.request ? `${t("Vote")} (${g.request.vote_count})` : t("Request")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {!found && top.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">🔥 {t("Most wanted right now")}</p>
            {top.map((r, i) => {
              const voted = myVotes.includes(r.id);
              return (
                <div key={r.id} className="flex items-center gap-2.5">
                  <span className={`w-4 shrink-0 text-center text-sm font-bold ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>{i + 1}</span>
                  {thumb(r.icon_url)}
                  <p className="min-w-0 flex-1 truncate text-sm">{r.game_name}</p>
                  <button onClick={() => vote(r)} disabled={busy === r.id} aria-label={t("Vote")}
                    className={`flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold transition-colors ${voted ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary/40 hover:border-primary/60"}`}>
                    {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className={`h-3 w-3 ${voted ? "fill-current" : ""}`} />}
                    {fmtCount(r.vote_count)}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {!found && top.length === 0 && (
          <p className="text-center text-xs font-medium text-violet-200/90">🏆 {t("No requests yet. Be the first!")}</p>
        )}

        {needLogin && !user && (
          <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-medium">{t("Sign in to request & vote (one click, no password):")}</p>
            <DiscordSignInButton label={t("Continue with Discord")} redirectPath={location.pathname} />
            <GoogleSignInButton label={t("Continue with Google")} redirectPath={location.pathname} />
          </div>
        )}

        <Link to="/request" className="flex items-center justify-center gap-1 text-xs font-semibold text-violet-300 hover:underline">
          <Key className="h-3 w-3" /> {t("See all requests")} <ChevronRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
    </div>
  );
}
