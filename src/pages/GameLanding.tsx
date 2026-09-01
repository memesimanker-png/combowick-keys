import { useParams, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, Sparkles, MessageCircle, Crown, Zap } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { AdSlot } from "@/components/AdSlot";
import { FeatureVoteCTA } from "@/components/FeatureVoteCTA";
import { GAME_LANDINGS } from "@/lib/game-landings";

const DISCORD_URL = "https://discord.gg/combowick";

export default function GameLanding() {
  const { game } = useParams<{ game: string }>();
  const config = game ? GAME_LANDINGS[game] : undefined;

  if (!config) return <Navigate to="/scripts" replace />;

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Scripts", url: "/scripts" },
    { name: config.game, url: `/games/${config.slug}` },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: `${config.game} Script — ComboWick`,
      applicationCategory: "GameApplication",
      operatingSystem: "Roblox",
      description: config.metaDescription,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      aggregateRating: undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: config.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <Layout>
      <SEOHead
        title={config.title}
        description={config.metaDescription}
        breadcrumbs={breadcrumbs}
        jsonLd={jsonLd}
        ogType="product"
      />

      {/* Hero */}
      <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-section opacity-40" />
        <div className="absolute inset-0 star-field opacity-30" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-bronze/10 border border-bronze/30 mb-6"
          >
            <Sparkles className="w-3 h-3 text-bronze-light" />
            <span className="text-[10px] font-serif tracking-[0.3em] uppercase text-bronze-light">
              {config.status === "live" ? "Live Drop" : config.status === "coming-soon" ? "Coming Soon" : "In Development"}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4"
          >
            <span className="text-gradient-neon">{config.h1}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-8 leading-relaxed"
          >
            {config.intro}
          </motion.p>

          <div className="flex flex-col sm:flex-row gap-3">
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="text-sm px-8 py-6 uppercase tracking-wider neon-glow group">
                <MessageCircle className="mr-2 h-4 w-4" />
                Notify Me on Discord
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <Link to="/scripts">
              <Button variant="outline" size="lg" className="text-sm px-8 py-6 uppercase tracking-wider border-bronze/30 hover:bg-bronze/10 hover:text-bronze-light">
                Browse Live Scripts
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features OR Coming-Soon block */}
      <section className="py-16 sm:py-20 border-t border-border/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {config.features.length > 0 ? (
            <>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-2 tracking-tight">
                What the {config.game} Script Includes
              </h2>
              <p className="text-sm text-muted-foreground mb-10 font-serif italic">
                // every feature — no paywalled basics
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {config.features.map((f) => (
                  <div
                    key={f}
                    className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border/40 hover:border-bronze/40 transition-colors"
                  >
                    <Check className="w-4 h-4 text-bronze-light mt-1 flex-shrink-0" />
                    <span className="text-sm text-foreground/90">{f}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-2 tracking-tight">
                {config.game} Script — Not Live Yet
              </h2>
              <p className="text-sm text-muted-foreground mb-8 font-serif italic">
                // honest update — feature voting is open below + in Discord
              </p>
              <FeatureVoteCTA slug={config.slug} game={config.game} />
            </>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <AdSlot slot="3333333333" format="auto" responsive minHeight={250} />
      </div>

      {/* How it works */}
      <section className="py-16 sm:py-20 border-t border-border/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-10 tracking-tight">
            How to Use the {config.game} Script
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Get an Executor", d: "Hydrogen, Delta, Wave or Solara — all supported. Mobile and PC." },
              { n: "02", t: "Claim a Free Key", d: "30-second HWID verification. Key lasts 11 hours per device." },
              { n: "03", t: "Paste & Execute", d: "Copy the loadstring from the script page, paste into your executor, hit Execute." },
            ].map((s) => (
              <div key={s.n} className="p-6 rounded-xl bg-card/40 border border-border/40">
                <div className="font-serif text-bronze-light/60 text-xs tracking-[0.3em] mb-3">{s.n}</div>
                <h3 className="font-heading text-lg font-bold mb-2">{s.t}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium upsell */}
      <section className="py-16 sm:py-20 border-t border-border/40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <Crown className="w-8 h-8 text-bronze-light mx-auto mb-4" />
          <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
            Tired of the 11-Hour Key Refresh?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Premium keys skip the verification entirely. $5 for 7 days, $9.99 monthly, $49.99 lifetime.
          </p>
          <Link to="/premium-keys">
            <Button size="lg" className="text-sm px-8 py-6 uppercase tracking-wider neon-glow">
              <Zap className="mr-2 h-4 w-4" />
              Get Premium Key
            </Button>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20 border-t border-border/40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-10 tracking-tight">
            {config.game} Script — FAQ
          </h2>
          <div className="space-y-4">
            {config.faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl bg-card/40 border border-border/40 p-5 hover:border-bronze/40 transition-colors"
              >
                <summary className="font-heading text-base font-semibold cursor-pointer list-none flex items-center justify-between">
                  {f.q}
                  <span className="text-bronze-light/70 group-open:rotate-45 transition-transform text-xl">+</span>
                </summary>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-20 overflow-hidden border-t border-border/40">
        <div className="absolute inset-0 bg-gradient-section opacity-40" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-serif italic text-bronze-light/80 text-sm tracking-wider mb-3">— Drop Schedule —</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-4 tracking-tight">
            Mon / Wed / Fri · 18:00 UTC
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Be the first to know when the {config.game} script drops. Discord notifications fire instantly.
          </p>
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="text-sm px-10 py-7 uppercase tracking-wider neon-glow">
              Join the Discord
            </Button>
          </a>
        </div>
      </section>
    </Layout>
  );
}
