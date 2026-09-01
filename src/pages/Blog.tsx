import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Calendar, ArrowRight, BookOpen } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { AdSlot } from "@/components/AdSlot";

const blogPosts = [
  // SEO: targets ~5,000/mo Brazilian Portuguese queries ("como usar script no roblox" + variants).
  {
    slug: "como-usar-script-no-roblox",
    title: "Como Usar Script no Roblox 2026 — Guia Completo (Mobile + PC)",
    excerpt: "Aprenda passo a passo como usar, baixar e instalar scripts no Roblox em 2026. Guia para PC e mobile, executores recomendados, segurança e dicas para evitar ban.",
    category: "Tutoriais",
    date: "May 14, 2026",
    readTime: "9 min read",
  },
  // SEO: targets ~30,000/mo Philippines + Indonesia "how to use roblox script" queries.
  {
    slug: "how-to-use-roblox-scripts",
    title: "How to Use Roblox Scripts in 2026 (Mobile + PC) — Beginner Guide",
    excerpt: "Step-by-step beginner guide to using Roblox scripts in 2026. Best free executors for PC and mobile, how to inject loadstrings safely, and how to avoid bans.",
    category: "Guides",
    date: "May 14, 2026",
    readTime: "10 min read",
  },
  {
    slug: "roblox-account-security-guide",
    title: "Complete Roblox Account Security Guide 2026",
    excerpt: "Protect your Roblox account from hackers with our comprehensive security guide. Learn about two-factor authentication, password best practices, recognizing phishing attempts, and advanced security measures every player should know.",
    category: "Security",
    date: "January 20, 2026",
    readTime: "8 min read",
  },
  {
    slug: "how-to-earn-robux-free",
    title: "Legitimate Ways to Earn Free Robux in 2026",
    excerpt: "Learn honest and safe methods to earn Robux without spending money. We cover official Roblox programs, game development earnings, affiliate programs, and why you should avoid scam generators that promise free currency.",
    category: "Guides",
    date: "January 15, 2026",
    readTime: "7 min read",
  },
  {
    slug: "roblox-trading-tips",
    title: "Roblox Trading Guide: How to Profit Safely",
    excerpt: "Master the art of trading limited items on Roblox. Understand item values, market trends, avoid common scams, and build your virtual wealth with smart, strategic trading decisions backed by research.",
    category: "Trading",
    date: "January 12, 2026",
    readTime: "12 min read",
  },
  {
    slug: "best-roblox-games-2026",
    title: "Top 15 Roblox Games to Play in 2026",
    excerpt: "Discover the most popular and exciting Roblox games this year. From immersive adventure games and competitive shooters to creative simulators and social hangouts — find your next obsession.",
    category: "Gaming",
    date: "January 18, 2026",
    readTime: "10 min read",
  },
  {
    slug: "roblox-studio-beginners",
    title: "Roblox Studio for Beginners: Create Your First Game",
    excerpt: "Start your game development journey with Roblox Studio. This beginner-friendly tutorial covers the basics of building environments, scripting game logic, designing UI, and publishing your creation for others to play.",
    category: "Development",
    date: "January 10, 2026",
    readTime: "15 min read",
  },
  {
    slug: "premium-membership-analysis",
    title: "Is Roblox Premium Worth It? Complete Analysis",
    excerpt: "A detailed breakdown of Roblox Premium benefits, costs, and whether it's worth the monthly subscription. We compare all three tiers, calculate the real value, and help you decide if it's right for your gaming style.",
    category: "Analysis",
    date: "January 8, 2026",
    readTime: "6 min read",
  },
  {
    slug: "roblox-lua-scripting-tips",
    title: "10 Lua Scripting Tips Every Roblox Developer Should Know",
    excerpt: "Level up your Roblox game development with these practical Lua scripting tips. From optimizing performance with task.wait() to mastering RemoteEvents for multiplayer, these techniques will make your code cleaner and your games faster.",
    category: "Development",
    date: "February 5, 2026",
    readTime: "11 min read",
  },
  {
    slug: "roblox-avatar-customization-guide",
    title: "Ultimate Roblox Avatar Customization Guide 2026",
    excerpt: "Express yourself on Roblox with the complete avatar customization guide. Learn about layered clothing, UGC items, animation packs, body morphs, and how to create a unique look without spending a fortune on Robux.",
    category: "Guides",
    date: "February 10, 2026",
    readTime: "9 min read",
  },
  {
    slug: "roblox-group-management",
    title: "How to Build and Manage a Successful Roblox Group",
    excerpt: "Running a Roblox group takes more than just creating one. This guide covers recruiting members, setting up ranks and permissions, managing group funds, creating group games, and building an active community that lasts.",
    category: "Community",
    date: "February 15, 2026",
    readTime: "10 min read",
  },
  {
    slug: "roblox-game-monetization",
    title: "Roblox Game Monetization: How Developers Actually Earn Money",
    excerpt: "A realistic breakdown of how Roblox developers earn revenue through game passes, developer products, Premium Payouts, and the Developer Exchange program. Includes real strategies for pricing and retention.",
    category: "Development",
    date: "February 20, 2026",
    readTime: "13 min read",
  },
  {
    slug: "roblox-parental-controls-safety",
    title: "Roblox Parental Controls & Safety: A Parent's Complete Guide",
    excerpt: "Everything parents need to know about keeping children safe on Roblox. Covers account restrictions, chat filters, spending limits, privacy settings, and how to have productive conversations about online safety.",
    category: "Safety",
    date: "February 25, 2026",
    readTime: "8 min read",
  },
  {
    slug: "roblox-device-compatibility-performance",
    title: "Roblox Device Compatibility & Performance Optimization Guide",
    excerpt: "Get the best Roblox experience on any device. This guide covers PC, Mac, mobile, Xbox, and tablet optimization — graphics settings, FPS improvements, network fixes, and hardware recommendations for smooth gameplay.",
    category: "Technical",
    date: "March 2, 2026",
    readTime: "9 min read",
  },
  {
    slug: "roblox-economy-robux-explained",
    title: "How the Roblox Economy Works: Robux, Trading & DevEx Explained",
    excerpt: "A deep dive into Roblox's virtual economy — how Robux flows between players, developers, and Roblox Corporation. Understand trading markets, the Developer Exchange, inflation, and how value is created on the platform.",
    category: "Analysis",
    date: "March 8, 2026",
    readTime: "12 min read",
  },
  {
    slug: "roblox-reporting-moderation-guide",
    title: "How Roblox Moderation Works: Reporting, Bans & Appeals",
    excerpt: "Understand Roblox's moderation system from the inside. Learn how to report rule-breakers effectively, what behaviors lead to warnings or bans, how the appeals process works, and how to keep your account in good standing.",
    category: "Safety",
    date: "March 12, 2026",
    readTime: "8 min read",
  },
  {
    slug: "roblox-events-seasonal-guide",
    title: "Roblox Events & Seasonal Content: How to Never Miss Free Rewards",
    excerpt: "Roblox runs dozens of events each year with free items, exclusive badges, and limited-time game modes. This guide explains how events work, where to find them, and strategies to collect every free reward available.",
    category: "Guides",
    date: "March 18, 2026",
    readTime: "7 min read",
  },
];

export default function Blog() {
  return (
    <Layout>
      <SEOHead
        title="Combo_WICK Blog — Roblox Scripts, Lua Tutorials & Security Guides"
        description="The Combo_WICK blog: Roblox security guides, Lua scripting walkthroughs, executor reviews, anti-cheat explainers, and update notes. Original content written by the COMBO_WICK team."
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Blog", url: "/blog" }]}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Expert Guides</span>
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">
              Roblox Guides & Tips
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Expert articles to help you get the most out of Roblox — from account security and trading strategies to game development tutorials and earning guides.
            </p>
          </div>

          <AdSlot slot="5555555555" format="auto" responsive minHeight={250} className="mb-8" />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`}>
                <Card className="p-6 bg-glass hover:border-primary/30 transition-all duration-300 h-full flex flex-col group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        {post.category}
                      </span>
                      <span className="text-xs text-muted-foreground">{post.readTime}</span>
                    </div>
                    <h2 className="font-heading text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {post.date}
                    </div>
                    <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
