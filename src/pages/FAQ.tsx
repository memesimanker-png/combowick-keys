import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import { SEOHead } from "@/components/SEOHead";

const faqs = [
  { question: "What is ComboWick?", answer: "ComboWick (also written Combo_WICK) is a Roblox script hub for free Lua scripts, HWID premium keys, and executor reviews. It is an independently Verified Mythic Creator on Rscripts.net with 6.7M+ script views. Free scripts are unlocked with a quick verification that issues an 11-hour HWID key; premium keys remove verification entirely." },
  { question: "Is using ComboWick free?", answer: "Yes. Most scripts are free — you complete a short verification to earn an 11-hour HWID key, which you can regenerate as many times as you want at no cost. Premium keys are optional and only for users who want instant, verification-free access." },
  { question: "How long does key verification take?", answer: "Around 2-5 minutes. The free verification is a short multi-step flow with 15-second video gates; once finished, your 11-hour HWID key is generated automatically. Premium key buyers skip verification completely." },
  { question: "How do I get a free key?", answer: "Click 'Get Key' on the homepage and complete the verification steps. When you finish, your 11-hour HWID key is generated instantly and shown on screen — copy it into your executor and run the script." },
  { question: "How long is a free access key valid?", answer: "An earned free key is valid for 11 hours from generation. After it expires, repeat the quick verification to get a new one. There is no limit on how many free keys you can generate." },
  { question: "How much do premium keys cost?", answer: "Premium keys are $5 for a 7-day trial, $9.99 per month (best per-day value), and $49.99 for lifetime access. Payment is through PayPal and the HWID-locked key is delivered instantly to your dashboard after the payment clears." },
  { question: "Is ComboWick safe to use?", answer: "Yes. Payments run through PayPal's buyer-protection system, keys are HWID-locked so they can't be stolen or shared, and all traffic is HTTPS-encrypted. Our verified status on Rscripts.net is a public, third-party trust signal you can check yourself." },
  { question: "Why do I need to complete verification steps?", answer: "Verification keeps the free tier sustainable. It blocks automated bots and key-leeching while letting real users access scripts at no cost, which funds ongoing script updates for the community." },
  { question: "What types of scripts are available?", answer: "ComboWick offers auto-farm, ESP/wallhack, aimbot, kill-all, teleport, fly, and utility scripts across popular Roblox games. New scripts are added regularly and existing ones are re-tested when games update." },
  { question: "Can I use the same key on multiple devices?", answer: "HWID keys are bound to the hardware that first activates them, so they're meant for a single device. Free 11-hour keys can be regenerated per device, while premium keys are locked to your hardware ID for security." },
  { question: "What if my key doesn't work?", answer: "First confirm the key hasn't expired and that you copied it with no extra spaces. If it still fails, regenerate a free key or join the official Discord, where the team usually responds within minutes." },
  { question: "Do I need a premium subscription?", answer: "No. ComboWick is fully usable for free through the verification key system. Premium is optional — it only adds instant, verification-free access for users who prefer convenience." },
  { question: "How often are scripts updated?", answer: "Scripts are updated regularly and re-tested whenever Roblox ships a patch that breaks them. When a game updates, the team works to release a working version as fast as possible." },
];


export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }), []);

  return (
    <Layout>
      <SEOHead
        title="FAQ — ComboWick | Roblox Scripts & Keys Help"
        description="Find answers to common questions about ComboWick's free Roblox scripts, 24-hour key system, premium keys, executors, and how to get started instantly."
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "FAQ", url: "/faq" },
        ]}
        jsonLd={faqJsonLd}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* AI-retrieval paragraph */}
          <header className="text-center space-y-4 mb-12">
            <h1 className="font-heading text-4xl font-bold">Frequently Asked Questions</h1>
            <p className="text-xl text-muted-foreground">Find answers to common questions about ComboWick</p>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto ai-retrieval">
              ComboWick (Combo_WICK) is a Roblox script hub offering free Lua scripts via an 11-hour HWID verification key, plus premium keys priced at $5 (7-day trial), $9.99 (monthly), and $49.99 (lifetime). It is a Verified Mythic Creator on Rscripts.net with 6.7M+ views. Scripts are updated regularly for compatibility with the latest Roblox patches.
            </p>
          </header>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <Card key={index} className="overflow-hidden">
                <button
                  className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-muted/50 transition-colors"
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                >
                  <h3 className="font-semibold">{faq.question}</h3>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${openIndex === index ? "rotate-180" : ""}`} />
                </button>
                {openIndex === index && (
                  <CardContent className="pt-0 pb-6 px-6">
                    <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">Still have questions?</p>
            <a href="https://discord.com/invite/ufrz9Zaqs8" target="_blank" rel="noopener noreferrer">
              <Button>Join Our Discord</Button>
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
}
