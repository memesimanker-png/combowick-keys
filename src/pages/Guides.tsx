import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, Code, Shield, Gamepad2, Key, ArrowRight, Lightbulb, Wrench } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

const guides = [
  {
    title: "Getting Started with Combo_WICK",
    description: "The absolute beginner's path. Generate your first free 11-hour key in under two minutes, install a compatible executor for your platform, attach to Roblox, and run your first script. Includes screenshots for both Windows and mobile workflows.",
    icon: Key,
    link: "/keys",
    readTime: "5 min read",
  },
  {
    title: "Lua Scripting Tutorials",
    description: "A structured Lua programming course written for Roblox developers and script authors. Covers variables, control flow, functions, tables, metatables, OOP patterns, and the Roblox-specific globals (game, workspace, getgenv, getrenv) you actually need to know.",
    icon: Code,
    link: "/tutorials",
    readTime: "30 min course",
  },
  {
    title: "Executor Compatibility Guide",
    description: "Side-by-side comparison of every executor we currently recommend. UNC scores, supported platforms (Windows / macOS / iOS / Android), feature flags (HTTP, Drawing, instances), update cadence, and known issues. Refreshed monthly.",
    icon: Gamepad2,
    link: "/executors",
    readTime: "8 min read",
  },
  {
    title: "Understanding Anti-Cheat Systems",
    description: "How Roblox's anti-cheat detects unusual activity, the difference between client-side and server-side checks, why some scripts get you flagged instantly while others don't, and concrete tactics for keeping your account safe during testing.",
    icon: Shield,
    link: "/anti-cheat-guide",
    readTime: "10 min read",
  },
  {
    title: "Premium Key System Documentation",
    description: "Technical deep-dive on how Combo_WICK's HWID-locked key system works under the hood — key generation, hardware fingerprinting, expiry handling, the dashboard activation flow, and the API endpoints used by partner script authors.",
    icon: BookOpen,
    link: "/docs",
    readTime: "12 min read",
  },
  {
    title: "Account Safety Best Practices",
    description: "Why you should always use an alt account for testing scripts, how to set up 2-factor authentication on Roblox, recognizing phishing attempts that target script users, and what to do if your main account gets compromised.",
    icon: Shield,
    link: "/tutorials",
    readTime: "7 min read",
  },
  {
    title: "Fair Use & Responsible Scripting",
    description: "Where the line is between learning, testing, and abuse. How we curate what goes on the Combo_WICK hub, why some script categories are deliberately not listed, and the community standards we ask every user to follow.",
    icon: Lightbulb,
    link: "/fair-use",
    readTime: "4 min read",
  },
  {
    title: "Troubleshooting Common Issues",
    description: "Script won't inject? Key activation failing? Executor crashing on game launch? This guide walks through the 10 most common issues users hit and the exact steps to fix each one — based on real Discord support tickets.",
    icon: Wrench,
    link: "/faq",
    readTime: "6 min read",
  },
];

export default function Guides() {
  return (
    <Layout>
      <SEOHead
        title="Combo_WICK Guides — Roblox Scripts, Lua Tutorials & Executor Help"
        description="Long-form guides for Combo_WICK users — getting-started walkthroughs, Lua scripting tutorials, executor comparisons, anti-cheat explainers, and fair-use guidance. Written by the COMBO_WICK team."
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Guides", url: "/guides" },
        ]}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <header className="text-center space-y-4 mb-12">
            <h1 className="font-heading text-4xl font-bold">Combo_WICK Guides &amp; Resources</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to get the most out of Combo_WICK — from your first free key to advanced Lua scripting. Every guide below is written from scratch by our team based on real questions from the Discord community.
            </p>
          </header>

          <Card className="p-6 mb-10 bg-primary/5 border-primary/20">
            <h2 className="font-heading text-lg font-semibold mb-2">New to Roblox scripting?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Start with <Link to="/keys" className="text-primary hover:underline">Getting Started with Combo_WICK</Link>, then read the <Link to="/executors" className="text-primary hover:underline">Executor Compatibility Guide</Link> to pick the right tool for your device. Once you've run your first script successfully, the <Link to="/tutorials" className="text-primary hover:underline">Lua Scripting Tutorials</Link> are the natural next step if you want to start writing your own.
            </p>
          </Card>

          <div className="grid gap-6">
            {guides.map((guide) => (
              <Card key={guide.title} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <guide.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                        <h3 className="font-heading font-semibold text-lg">{guide.title}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground uppercase tracking-wider">{guide.readTime}</span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-3 leading-relaxed">{guide.description}</p>
                      <Link to={guide.link}>
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 px-0">
                          Read Guide <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="p-8 mt-12 text-center bg-glass">
            <h2 className="font-heading text-xl font-bold mb-3">Can't find what you need?</h2>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              The Combo_WICK Discord has dedicated help channels for every topic — script issues, key activation, executor setup, and Lua questions.
            </p>
            <a href="https://discord.com/invite/ufrz9Zaqs8" target="_blank" rel="noopener noreferrer">
              <Button>Ask on Discord</Button>
            </a>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
