import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { DiscordSignInButton } from "@/components/DiscordSignInButton";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/translation-context";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, ThumbsUp, Lightbulb, Users, CheckCircle2, Hammer, Ban, Sparkles, Key, ExternalLink } from "lucide-react";

type Status = "requested" | "in_progress" | "released" | "declined";
interface Req { id: number; universe_id: string; place_id: string; game_name: string; icon_url: string | null; players_at_request: number | null; status: Status; admin_note: string | null; vote_count: number; discord_thread_id: string | null; created_at: string }
interface Found { universe_id: string; place_id: string; name: string; playing: number; icon_url: string | null; covered: boolean; request: { id: number; status: Status; vote_count: number } | null }

const DISCORD_FORUM = "https://discord.com/channels/934631259861319733/1559638557960831126";
const call = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("script-requests", { body });
  if (error) {
    // functions.invoke puts the JSON body of non-2xx replies on error.context
    try { const j = await (error as any).context?.json?.(); if (j) return j; } catch { /* */ }
    return { success: false, error: error.message };
  }
  return data;
};
const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("en-US");

export default function RequestScripts() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [params] = useSearchParams();

  const [reqs, setReqs] = useState<Req[]>([]);
  const [myVotes, setMyVotes] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"top" | "new" | "in_progress" | "released">("top");
  const [filter, setFilter] = useState("");

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<Found[] | null>(null);
  const [busy, setBusy] = useState<string | number | null>(null);

  const load = useCallback(async () => {
    const j = await call({ action: "list" });
    if (j?.success) { setReqs(j.requests); setMyVotes(j.my_votes ?? []); }
    setLoading(false);
  }, []);
  useEffect(() => { if (!authLoading) load(); }, [authLoading, user?.id, load]);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true); setFound(null);
    const j = await call({ action: "lookup", query });
    setFound(j?.success ? j.games : []);
    setSearching(false);
  };
  useEffect(() => { if (params.get("q")) search(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const request = async (g: Found) => {
    setBusy(g.place_id);
    const j = await call({ action: "request", place_id: g.place_id });
    setBusy(null);
    if (j?.success) {
      toast({ title: j.existed ? t("Already requested, your vote was added! 👍") : t("Request sent! 🎉"), description: t("Share it so people vote. The most-voted games get made first.") });
      setFound(null); setQuery(""); setTab("new"); load();
    } else toast({ variant: j?.covered ? "default" : "destructive", title: j?.covered ? t("Already supported ✅") : t("Couldn't send the request"), description: j?.error });
  };

  const vote = async (r: Req) => {
    if (!user) { document.getElementById("signin")?.scrollIntoView({ behavior: "smooth" }); toast({ title: t("Sign in to vote") }); return; }
    setBusy(r.id);
    const j = await call({ action: "vote", id: r.id });
    setBusy(null);
    if (j?.success) {
      setReqs((xs) => xs.map((x) => (x.id === r.id ? { ...x, vote_count: j.vote_count } : x)));
      setMyVotes((v) => (j.voted ? [...v, r.id] : v.filter((x) => x !== r.id)));
    } else toast({ variant: "destructive", title: j?.error ?? t("Something went wrong") });
  };

  const setStatus = async (r: Req, status: Status) => {
    const note = status === "declined" ? window.prompt(t("Reason (shown to players, optional):")) ?? "" : "";
    setBusy(r.id);
    const j = await call({ action: "set_status", id: r.id, status, note });
    setBusy(null);
    if (j?.success) { toast({ title: `${r.game_name} → ${status}` }); load(); } else toast({ variant: "destructive", title: j?.error });
  };

  const shown = useMemo(() => {
    let xs = reqs.filter((r) => (tab === "top" ? r.status === "requested" : tab === "new" ? r.status === "requested" : r.status === tab));
    if (tab === "new") xs = [...xs].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    const f = filter.trim().toLowerCase();
    return f ? xs.filter((r) => r.game_name.toLowerCase().includes(f)) : xs;
  }, [reqs, tab, filter]);
  const counts = useMemo(() => ({
    open: reqs.filter((r) => r.status === "requested").length,
    in_progress: reqs.filter((r) => r.status === "in_progress").length,
    released: reqs.filter((r) => r.status === "released").length,
  }), [reqs]);

  const badge = (s: Status) => s === "in_progress" ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300"><Hammer className="h-3 w-3" />{t("In progress")}</span>
    : s === "released" ? <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-semibold text-green-300"><CheckCircle2 className="h-3 w-3" />{t("Released")}</span>
    : s === "declined" ? <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-300"><Ban className="h-3 w-3" />{t("Declined")}</span> : null;

  return (
    <Layout>
      <SEOHead
        title="Request a Roblox Script — Vote for the Next Game | ComboWick"
        description="Request a free Roblox script for any game and vote for others. The most-voted games get a ComboWick script first."
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Request a Script", url: "/request" }]}
      />
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-8">
          {/* hero */}
          <div className="text-center space-y-3">
            <Lightbulb className="h-12 w-12 text-primary mx-auto" />
            <h1 className="font-heading text-3xl sm:text-5xl font-bold">{t("Request a")} <span className="text-primary">{t("Script")}</span></h1>
            <p className="text-muted-foreground max-w-xl mx-auto">{t("Want a script for your game? Request it or vote for one that's already requested. The most-voted games get made first.")}</p>
          </div>

          {/* how it works */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Search, title: t("1. Find your game"), text: t("Paste the Roblox link or type the game's name.") },
              { icon: ThumbsUp, title: t("2. Request or vote"), text: t("Every account gets one vote per game. Share it with friends!") },
              { icon: Sparkles, title: t("3. We build it"), text: t("Top games get made first. You'll see it here and on our Discord.") },
            ].map((s) => (
              <Card key={s.title} className="bg-glass border-border/50"><CardContent className="p-4 space-y-1.5">
                <s.icon className="h-5 w-5 text-primary" />
                <p className="font-semibold text-sm">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.text}</p>
              </CardContent></Card>
            ))}
          </div>

          {/* sign in OR search */}
          {!user ? (
            <Card id="signin" className="border-primary/30">
              <CardHeader className="text-center">
                <CardTitle>{t("Sign in to request & vote")}</CardTitle>
                <CardDescription>{t("One click, no password. Signing in with Discord also adds you to our server.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-w-sm mx-auto">
                <DiscordSignInButton label={t("Continue with Discord")} redirectPath="/request" />
                <GoogleSignInButton label={t("Continue with Google")} redirectPath="/request" />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle>{t("Request a game")}</CardTitle>
                <CardDescription>{t("Paste a Roblox game link, or type the game's name.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <form onSubmit={search} className="flex gap-2">
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("e.g. roblox.com/games/123… or Build A Boat")} maxLength={200} />
                  <Button type="submit" disabled={searching || query.trim().length < 2} className="shrink-0 gap-1.5">
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} {t("Search")}
                  </Button>
                </form>
                {found && found.length === 0 && <p className="text-sm text-muted-foreground">{t("No games found. Try the exact name or paste the game link.")}</p>}
                {found && found.length > 0 && (
                  <div className="divide-y divide-border/60 rounded-lg border border-border/60">
                    {found.map((g) => (
                      <div key={g.universe_id} className="flex items-center gap-3 p-3">
                        {g.icon_url ? <img src={g.icon_url} alt="" className="h-12 w-12 rounded-md object-cover shrink-0" loading="lazy" /> : <div className="h-12 w-12 rounded-md bg-secondary shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-sm">{g.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {fmt(g.playing)} {t("playing")}</p>
                        </div>
                        {g.covered ? (
                          <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5 border-green-500/40 text-green-300"><Link to="/keys"><Key className="h-3.5 w-3.5" />{t("Supported! Get key")}</Link></Button>
                        ) : g.request && g.request.status !== "requested" ? (
                          <span className="shrink-0">{badge(g.request.status)}</span>
                        ) : (
                          <Button size="sm" onClick={() => request(g)} disabled={busy === g.place_id} className="shrink-0 gap-1.5">
                            {busy === g.place_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                            {g.request ? `${t("Vote")} (${g.request.vote_count})` : t("Request")}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">{t("Max 3 open requests per account. Already supported games show a key button instead.")}</p>
              </CardContent>
            </Card>
          )}

          {/* board */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {([
                ["top", `🔥 ${t("Most wanted")}`, counts.open],
                ["new", `🆕 ${t("Newest")}`, counts.open],
                ["in_progress", `🛠️ ${t("In progress")}`, counts.in_progress],
                ["released", `✅ ${t("Released")}`, counts.released],
              ] as const).map(([k, label, n]) => (
                <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${tab === k ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"}`}>
                  {label} <span className="opacity-70">{n}</span>
                </button>
              ))}
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("Filter…")} className="ml-auto h-8 w-full sm:w-44" />
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : shown.length === 0 ? (
              <Card className="bg-glass border-border/50"><CardContent className="py-10 text-center text-sm text-muted-foreground">
                {tab === "released" ? t("Nothing released from requests yet.") : tab === "in_progress" ? t("Nothing in progress right now.") : t("No requests yet. Be the first!")}
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {shown.map((r, i) => {
                  const voted = myVotes.includes(r.id);
                  const open = r.status === "requested" || r.status === "in_progress";
                  return (
                    <Card key={r.id} className="bg-glass border-border/50">
                      <CardContent className="flex items-center gap-3 p-3">
                        {tab === "top" && <span className={`w-6 shrink-0 text-center font-heading text-lg font-bold ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>{i + 1}</span>}
                        {r.icon_url ? <img src={r.icon_url} alt="" className="h-12 w-12 rounded-md object-cover shrink-0" loading="lazy" /> : <div className="h-12 w-12 rounded-md bg-secondary shrink-0" />}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <a href={`https://www.roblox.com/games/${r.place_id}`} target="_blank" rel="noopener noreferrer" className="truncate font-semibold text-sm hover:text-primary">{r.game_name}</a>
                            {badge(r.status)}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {fmt(r.players_at_request)} {t("playing when requested")}</p>
                          {r.admin_note && <p className="text-xs text-muted-foreground italic">“{r.admin_note}”</p>}
                          {isAdmin && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {(["requested", "in_progress", "released", "declined"] as Status[]).filter((s) => s !== r.status).map((s) => (
                                <button key={s} onClick={() => setStatus(r, s)} disabled={busy === r.id} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground">→ {s}</button>
                              ))}
                            </div>
                          )}
                        </div>
                        {r.status === "released" ? (
                          <Button asChild size="sm" className="shrink-0 gap-1.5"><Link to="/keys"><Key className="h-3.5 w-3.5" />{t("Get key")}</Link></Button>
                        ) : (
                          <button onClick={() => vote(r)} disabled={!open || busy === r.id}
                            className={`flex shrink-0 flex-col items-center rounded-lg border px-3 py-1.5 transition-colors disabled:opacity-60 ${voted ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary/40 hover:border-primary/60"}`}
                            aria-label={t("Vote")}>
                            {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className={`h-4 w-4 ${voted ? "fill-current" : ""}`} />}
                            <span className="text-xs font-bold">{fmt(r.vote_count)}</span>
                          </button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground">
              {t("Requests also show up in our Discord.")}{" "}
              <a href={DISCORD_FORUM} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">{t("See them there")} <ExternalLink className="h-3 w-3" /></a>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
