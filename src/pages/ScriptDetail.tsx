import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldCheck, ChevronRight, TrendingUp, DollarSign, Play, Share2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useScriptBySlug, useRelatedScripts } from "@/hooks/useScripts";
import { Layout } from "@/components/Layout";
import { CopyButton } from "@/components/CopyButton";
import { ScriptCard } from "@/components/ScriptCard";
import { GameThumbnail } from "@/components/GameThumbnail";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { SEOHead } from "@/components/SEOHead";
import { EmailScriptButton } from "@/components/EmailScriptButton";
import { AdSlot } from "@/components/AdSlot";

export default function ScriptDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: script, isLoading } = useScriptBySlug(slug);
  const { data: related = [] } = useRelatedScripts(
    script?.id || "",
    script?.game || "",
    script?.category || ""
  );
  const { toast } = useToast();
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = script?.title || "Roblox Script";
    const text = `${title} — ${url}`;

    // Robust clipboard helper with execCommand fallback (works on http, old Safari, etc.)
    const copyText = async (value: string): Promise<boolean> => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value);
          return true;
        }
      } catch { /* fall through */ }
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    };

    // Prefer native share on touch devices (mobile/tablet) where it's reliable.
    const isTouch = typeof window !== "undefined" && (("ontouchstart" in window) || (navigator as any).maxTouchPoints > 0);
    if (isTouch && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: title, url });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch (err: any) {
        // AbortError = user cancelled; don't fall back in that case
        if (err?.name === "AbortError") return;
        // Otherwise fall through to clipboard
      }
    }

    const ok = await copyText(url);
    if (ok) {
      setShared(true);
      toast({ title: "Link copied!", description: "Share link copied to clipboard." });
      setTimeout(() => setShared(false), 2000);
    } else {
      // Last resort: prompt user to copy manually
      window.prompt("Copy this link:", url);
    }
  };


  const scriptJsonLd = useMemo(() => {
    if (!script) return [];
    return [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareSourceCode",
        name: `${script.game} Script — ${script.title}`,
        description: script.longDescription || script.description,
        programmingLanguage: "Lua",
        runtimePlatform: "Roblox",
        codeRepository: "https://combowick.com/scripts/" + script.slug,
        author: { "@type": "Organization", name: "ComboWick" },
        about: {
          "@type": "VideoGame",
          name: script.game,
          gamePlatform: "Roblox",
          ...((script as any).game_universe_id
            ? { url: `https://www.roblox.com/games/${(script as any).game_universe_id}` }
            : {}),
        },
        keywords: [
          script.game,
          `${script.game} script`,
          `${script.game} roblox script`,
          `${script.game} hack`,
          `${script.game} auto farm`,
          script.title,
        ].join(", "),
        dateCreated: script.createdAt,
        dateModified: script.updatedAt,
      },
      ...(script.faqs.length > 0 ? [{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: script.faqs.map((faq: any) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      }] : []),
    ];
  }, [script]);


  if (isLoading) {
    return (
      <Layout>
        <main className="mx-auto max-w-7xl px-4 py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </main>
      </Layout>
    );
  }

  if (!script) {
    return (
      <Layout>
        <main className="mx-auto max-w-7xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Script Not Found</h1>
          <p className="text-muted-foreground mt-2">The script you're looking for doesn't exist.</p>
          <Link to="/scripts" className="text-primary text-sm mt-4 inline-block hover:underline">
            Browse all scripts
          </Link>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead
        title={`${script.game} Script — ${script.title} | Free Roblox | ComboWick`.slice(0, 70)}
        description={`Free ${script.game} script for Roblox. ${script.description} Auto farm, ESP & more — copy & execute with any Roblox executor. Safe, verified, working ${new Date().getFullYear()}.`.slice(0, 160)}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Scripts", url: "/scripts" },
          { name: `${script.game} Scripts`, url: `/scripts?game=${encodeURIComponent(script.game)}` },
          { name: script.title, url: `/scripts/${script.slug}` },
        ]}
        jsonLd={scriptJsonLd}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <nav className="mb-6">
          <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
            <ChevronRight className="h-3 w-3" />
            <li><Link to="/scripts" className="hover:text-primary transition-colors">Scripts</Link></li>
            <ChevronRight className="h-3 w-3" />
            <li className="truncate max-w-xs">{script.title}</li>
          </ol>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          <article className="flex-1 min-w-0">
            <header className="mb-6">
              <div className="flex items-start gap-4 mb-4">
                <GameThumbnail gameName={script.game} universeId={(script as any).game_universe_id} size="lg" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {script.category}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      {script.game}
                    </span>
                    {script.is_paid && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        <DollarSign className="h-3 w-3" /> PAID
                      </span>
                    )}
                    {script.trending && (
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <TrendingUp className="h-3 w-3" /> Trending
                      </span>
                    )}
                    {script.verified && (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold font-heading" style={{ textWrap: "balance" as any }}>
                    {script.title}
                  </h1>
                </div>
              </div>
              <div className="mt-3 text-muted-foreground leading-relaxed space-y-3 max-w-prose">
                {(script.longDescription || script.description).split(/\n\n+/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span>Added {script.createdAt}</span>
                <span>Updated {script.updatedAt}</span>
              </div>
            </header>

            {/* YouTube Video Tutorial */}
            {script.youtube_url && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold mb-3">Video Tutorial</h2>
                <YouTubeEmbed url={script.youtube_url} />
              </section>
            )}

            {/* Script Code - show purchase CTA for paid scripts */}
            {script.is_paid ? (
              <section className="mb-8">
                <h2 className="text-lg font-semibold mb-3">Script Code</h2>
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-8 text-center">
                  <DollarSign className="h-10 w-10 text-yellow-400 mx-auto mb-3" />
                  <p className="text-lg font-semibold mb-2">This is a Premium Script</p>
                  <p className="text-sm text-muted-foreground mb-4">Purchase a premium key to access this script.</p>
                  <Link to="/premium-keys" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition-colors">
                    Purchase Access
                  </Link>
                </div>
              </section>
            ) : (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h2 className="text-lg font-semibold">Script Code</h2>
                  <div className="flex gap-2">
                    <EmailScriptButton script={script} />
                    <CopyButton text={script.code} />
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/50 p-4 overflow-x-auto">
                  <pre className="text-sm text-muted-foreground whitespace-pre font-mono leading-relaxed">
                    {script.code}
                  </pre>
                </div>
              </section>

            )}

            {/* In-article AdSense — only on free script pages with code shown above (not paid gates) */}
            {!script.is_paid && (
              <AdSlot slot="4444444444" format="fluid" layout="in-article" responsive={false} minHeight={200} />
            )}

            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {script.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/scripts?q=${encodeURIComponent(tag)}`}
                    className="text-xs px-3 py-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </section>

            {script.faqs.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  {script.faqs.map((faq, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-5">
                      <h3 className="font-medium mb-2">{faq.question}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </article>

          <aside className="lg:w-80 shrink-0">
            <div className="sticky top-20 space-y-6">
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold mb-3">Script Info</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Game</dt><dd>{script.game}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Category</dt><dd>{script.category}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Added</dt><dd>{script.createdAt}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Updated</dt><dd>{script.updatedAt}</dd></div>
                  {script.is_paid && (
                    <div className="flex justify-between"><dt className="text-muted-foreground">Access</dt><dd className="text-yellow-400 font-semibold">Premium</dd></div>
                  )}
                </dl>
              </div>

              {script.is_paid ? (
                <Link to="/premium-keys" className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition-colors">
                  <DollarSign className="h-4 w-4" /> Purchase Access
                </Link>
              ) : (
                <CopyButton text={script.code} className="w-full justify-center" />
              )}


              <a
                href={
                  script.game_url ||
                  ((script as any).game_universe_id
                    ? `https://www.roblox.com/games/${(script as any).game_universe_id}`
                    : `https://www.roblox.com/discover?Keyword=${encodeURIComponent(script.game)}`)
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-semibold transition-all shadow-sm shadow-green-500/20"
                aria-label={`Play ${script.game} on Roblox`}
              >
                <Play className="h-4 w-4 fill-current" /> Play Game on Roblox
              </a>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border border-primary/30 bg-secondary/40 hover:bg-secondary/70 text-foreground font-medium transition-colors"
                aria-label="Share this script"
              >
                {shared ? <Check className="h-4 w-4 text-green-400" /> : <Share2 className="h-4 w-4" />}
                {shared ? "Copied!" : "Share Script"}
              </button>

              {related.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="font-semibold mb-4 text-primary">Related Scripts</h3>
                  <div className="space-y-4">
                    {related.map((s) => (
                      <Link
                        key={s.id}
                        to={s.is_paid ? "/premium-keys" : `/scripts/${s.slug}`}
                        className="block rounded-lg border border-border bg-secondary/30 p-3 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <GameThumbnail gameName={s.game} universeId={(s as any).game_universe_id} size="sm" />
                          <span className="text-xs text-muted-foreground">{s.game}</span>
                          {s.is_paid && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold">PAID</span>
                          )}
                          {s.verified && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-400/10 text-green-400 font-medium">Safe</span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold leading-snug mb-1">{s.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </Layout>
  );
}
