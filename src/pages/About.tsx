import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Shield, Zap, Award, Heart, Target, Globe, Clock, Users, Code, Key } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

export default function About() {
  return (
    <Layout>
      <SEOHead
        title="About ComboWick — Roblox Scripts & Premium Keys Hub"
        description="Learn how ComboWick became a trusted Roblox community hub for free Lua scripts, HWID premium keys, executor reviews and Lua tutorials."
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "About", url: "/about" },
        ]}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: {
            "@type": "Person",
            name: "Combo_WICK",
            alternateName: ["ComboWick", "COMBO_WICK"],
            url: "https://combowick.com/about",
            image: "https://combowick.com/images/combo-wick-logo.png",
            jobTitle: "Roblox Script Developer & Verified Mythic Creator",
            knowsAbout: ["Roblox Lua scripting", "Roblox executors", "Roblox anti-cheat", "Game automation"],
            worksFor: { "@type": "Organization", name: "ComboWick", url: "https://combowick.com" },
            sameAs: [
              "https://www.youtube.com/@COMBO_WICK",
              "https://discord.com/invite/ufrz9Zaqs8",
              "https://rscripts.net/u/Combo_WICK",
            ],
          },
        }}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">
              About <span className="text-gradient-primary">Combo_WICK</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The community-run hub for Roblox Lua scripts, premium HWID keys, executor reviews, and Lua programming tutorials — built by gamers, for gamers.
            </p>
          </div>

          <Card className="p-8 bg-glass mb-8">
            <div className="flex items-start gap-4">
              <Target className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="font-heading text-2xl font-bold mb-4">Our Mission</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Combo_WICK exists to make the Roblox scripting community more accessible. Quality script hubs are scattered, paywalled behind sketchy links, or wrapped in malware. We curate, test, and document scripts in one place — with a transparent free tier and a fair premium tier for the people who want to support the work.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We started as a YouTube channel (<a href="https://www.youtube.com/@COMBO_WICK" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@COMBO_WICK</a>) covering Roblox script reviews and grew into a full hub: scripts, premium HWID keys, executor breakdowns, anti-cheat explainers, and beginner-to-advanced Lua tutorials.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-8 bg-glass mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Who We Are</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The Combo_WICK team is a small group of long-time Roblox players, Lua developers, and content creators. We actively play the games we cover, follow Roblox updates, and personally test the scripts and executors we recommend before they go on the site.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Every guide, tutorial, and script writeup is written by a team member with hands-on experience — not auto-generated filler. When we recommend an executor, it's because we've used it. When we publish a Lua tutorial, it's the same explanation we'd give a friend learning the language.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The team is distributed across multiple time zones, which is why our Discord support is genuinely 24/7. No tickets, no business hours — just real people answering in chat.
            </p>
          </Card>

          <Card className="p-8 bg-glass mb-8 border-primary/30">
            <div className="flex items-start gap-4">
              <Award className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="font-heading text-2xl font-bold mb-4">Verified, Checkable Reputation</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Combo_WICK is an independently <strong className="text-foreground">Verified Mythic Creator on Rscripts.net</strong>, the largest public Roblox script directory, with over <strong className="text-foreground">6.7 million script views</strong>. This is a real, third-party trust signal — you can verify it yourself rather than taking our word for it.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We deliberately do not post fake testimonials or invented review scores. Our proof is our public track record:{" "}
                  <a href="https://rscripts.net/u/Combo_WICK" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Rscripts profile</a>,{" "}
                  <a href="https://www.youtube.com/@COMBO_WICK" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">YouTube channel</a>, and a 50k+ member{" "}
                  <a href="https://discord.com/invite/ufrz9Zaqs8" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Discord community</a>.
                </p>
              </div>
            </div>
          </Card>



          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {[
              { icon: Code, title: "Curated Script Hub", desc: "Every script in the hub is hand-picked, tested in real game sessions, and tagged by category (auto-farm, ESP, utility, hub). We pull thumbnails directly from Roblox so you always know what game you're looking at." },
              { icon: Key, title: "HWID-Locked Premium Keys", desc: "Premium keys are bound to your hardware ID at first activation. They can't be shared, leaked, or stolen — only the device that activated the key can use it. Keys are generated and delivered the moment PayPal confirms payment." },
              { icon: Shield, title: "Security First", desc: "Payments run through PayPal's buyer-protection infrastructure. We never store card data. Sessions are SSL-encrypted, role-based access (admin/moderator/user) is enforced server-side, and all credentials live behind your account login." },
              { icon: Zap, title: "Instant Delivery", desc: "Premium keys are generated by our edge functions in under 2 seconds after PayPal posts a successful capture. No tickets, no manual review, no waiting on a human." },
              { icon: Award, title: "Quality Control", desc: "Scripts are re-tested whenever a game updates, and broken scripts are flagged or removed. Executor recommendations are kept current — we update reviews when UNC scores or features change." },
              { icon: Heart, title: "Discord-First Support", desc: "Our Discord (50k+ members) is where the community lives. Real-time help with key activation, executor setup, script issues — usually answered in minutes, not hours." },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="p-6 bg-glass">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-semibold mb-2">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-8 bg-glass mb-8">
            <h2 className="font-heading text-2xl font-bold mb-6">Why People Choose Combo_WICK</h2>
            <div className="space-y-4 text-muted-foreground">
              <p className="leading-relaxed">
                The Roblox script-hub space is full of bait sites: malware-laced loaders, pay-walled pirated scripts, and key systems that never deliver. Here's how Combo_WICK is different:
              </p>
              <ul className="space-y-3">
                {[
                  { bold: "Transparent Pricing", text: "$5 / 3-day trial, $9.99 / month (~$0.33/day, our best value), $49.99 / lifetime. The price you see is the price you pay — no hidden renewals, no upsells at checkout." },
                  { bold: "Real Free Tier", text: "Most scripts on the hub are free with a short 11-hour HWID key earned through a quick verification step. You don't have to pay to use Combo_WICK." },
                  { bold: "Original Written Content", text: "Tutorials, anti-cheat guides, executor reviews, and Lua walkthroughs are written from scratch by our team — never scraped, never AI-spam." },
                  { bold: "Multi-Language", text: "The site auto-translates into 10 languages (English, Spanish, French, German, Portuguese, Russian, Chinese, Japanese, Korean, Arabic) including full RTL support for Arabic readers." },
                  { bold: "Active Roadmap", text: "Public changelog, weekly script updates, and a Discord channel dedicated to user requests for new game support." },
                ].map((item) => (
                  <li key={item.bold} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span><strong className="text-foreground">{item.bold}:</strong> {item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="p-8 bg-glass mb-8">
            <h2 className="font-heading text-2xl font-bold mb-4">Fair Use &amp; Responsibility</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Combo_WICK publishes scripts and tools intended for educational use, personal-account testing, and Roblox development research. We strongly encourage users to read our <a href="/fair-use" className="text-primary hover:underline">Fair Use Policy</a> and respect the Terms of Service of every game and platform involved.
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Use scripts on alt accounts and private servers — not on competitive accounts you can't afford to lose.</li>
              <li>• Read our <a href="/anti-cheat-guide" className="text-primary hover:underline">Anti-Cheat Guide</a> before running anything in a game with active anti-cheat.</li>
              <li>• Credentials and keys are encrypted in transit (HTTPS everywhere) and HWID-bound where applicable.</li>
              <li>• Full GDPR compliance — see our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> for what we collect and why.</li>
              <li>• Independent security review of edge functions and RLS policies before each release.</li>
            </ul>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Users, label: "Discord Members", value: "50k+" },
              { icon: Globe, label: "Languages", value: "10" },
              { icon: Clock, label: "Key Delivery", value: "Instant" },
              { icon: Award, label: "Support", value: "24/7" },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label} className="p-4 bg-glass text-center">
                <Icon className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="font-heading text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
