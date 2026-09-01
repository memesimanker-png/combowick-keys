import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Key, Shield, Zap, Check, Star,
  ChevronDown, ChevronUp, Unlock, RefreshCw, Award, MessageCircle, Code2, ExternalLink, Crown
} from "lucide-react";
import { useState, useEffect } from "react";
import { VideoBackground } from "@/components/VideoBackground";
import { motion } from "framer-motion";
import { PayPalCheckoutModal } from "@/components/PayPalCheckoutModal";
import { PaidGameCard } from "@/components/PaidGameCard";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";
import { SEOHead } from "@/components/SEOHead";
import { PAID_GAMES } from "@/lib/paid-games";
import { usePaidGameSettings } from "@/hooks/usePaidGames";
import { useKeyDiscounts, applyDiscount } from "@/hooks/useKeyDiscounts";
import { DonateCard } from "@/components/DonateCard";
import { DiscountNotification } from "@/components/DiscountNotification";
import { OwnerCheckoutModal } from "@/components/OwnerCheckoutModal";


const tiers = [
  {
    id: "trial-7day",
    nameKey: "7-Day Trial",
    price: 5,
    color: "text-yellow-400",
    borderColor: "border-yellow-500/30",
    featureKeys: ["7 Days Full Access", "$0.71 per day", "Fast trial access"],
    subtitleKey: "Short entry price before monthly",
    buttonTextKey: "Purchase Now",
    buttonStyle: "bg-primary hover:bg-primary/90",
    isSubscription: false,
  },
  {
    id: "monthly",
    nameKey: "Monthly Access",
    price: 9.99,

    color: "text-green-400",
    borderColor: "border-green-500/30",
    featureKeys: ["30 Days Access", "$0.33 per day", "Priority support"],
    subtitleKey: "Best for regular buyers",
    buttonTextKey: "Purchase Now",
    buttonStyle: "bg-green-600 hover:bg-green-700",
    popular: true,
    isSubscription: false,
  },
  {
    id: "lifetime",
    nameKey: "Lifetime Key",
    price: 49.99,
    color: "text-red-400",
    borderColor: "border-red-500/30",
    featureKeys: ["Lifetime Access", "VIP Priority Support", "Premium Support"],
    buttonTextKey: "Purchase Now",
    buttonStyle: "bg-red-600 hover:bg-red-700",
    isSubscription: false,
  },
  {
    id: "custom-script",
    nameKey: "Custom Script Request",
    price: 0,
    color: "text-yellow-400",
    borderColor: "border-yellow-500/30",
    featureKeys: ["Contact on Discord", "Custom script tailored to your needs", "Professional support"],
    buttonTextKey: "Contact on Discord",
    buttonStyle: "bg-yellow-600 hover:bg-yellow-700",
    isDiscord: true,
    isSubscription: false,
  },
];

function FeatureIcon({ index }: { index: number }) {
  if (index === 0) return <Zap className="h-4 w-4 text-primary flex-shrink-0" />;
  if (index === 1) return <div className="h-4 w-4 rounded-full border-2 border-orange-400 flex-shrink-0" />;
  return <Check className="h-4 w-4 text-green-500 flex-shrink-0" />;
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors rounded-lg"
      >
        <span className="font-medium pr-4">{q}</span>
        {open ? <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{a}</div>
      )}
    </div>
  );
}

const overrideText = (value: string | null | undefined, fallback?: string) => {
  if (value === null || value === undefined) return fallback;
  return value;
};

const overridePrice = (value: number | null | undefined, fallback?: number) => {
  if (value === null || value === undefined) return fallback;
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : undefined;
};

export default function PremiumKeys() {
  const { t } = useTranslation();
  const [selectedTier, setSelectedTier] = useState<typeof tiers[0] | null>(null);
  const [paypalClientId, setPaypalClientId] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const { data: gameSettings } = usePaidGameSettings();
  const { data: keyDiscounts } = useKeyDiscounts();

  useEffect(() => {
    supabase.functions.invoke("paypal-config").then(({ data }) => {
      if (data?.client_id) setPaypalClientId(data.client_id);
    });
  }, []);

  const handlePurchase = (tier: typeof tiers[0]) => {
    if (tier.isDiscord) {
      window.open("https://discord.com/invite/ufrz9Zaqs8", "_blank");
      return;
    }
    const disc = applyDiscount(tier.price, keyDiscounts?.get(tier.id));
    setSelectedTier(disc ? { ...tier, price: disc.final } : tier);
    setModalOpen(true);
  };

  return (
    <Layout>
      <DiscountNotification />
      <OwnerCheckoutModal isOpen={ownerOpen} onClose={() => setOwnerOpen(false)} paypalClientId={paypalClientId} />
      <SEOHead
        title="ComboWick Premium Keys — Plans from $5 to $49.99"
        description="Buy a ComboWick HWID premium key. 7-day trial $5, monthly $9.99, lifetime $49.99. Instant PayPal delivery, full premium script access."
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Premium Keys", url: "/premium-keys" }]}
      />
      {/* Hero */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <VideoBackground overlay />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <Key className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">{t("Premium Features")}</span>
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight mb-4 max-w-4xl mx-auto">
              <span className="text-gradient-primary">{t("Premium Keys")}</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("prem_hero_desc")}
            </p>
            <a
              href="http://combowick.com/scripts"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <Code2 className="h-4 w-4" /> {t("Get Script")} <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Flagship: Owner/Admin access — high-ticket, placed up top so it's seen without scrolling */}
      <section className="pb-2 pt-2 sm:pt-4">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-yellow-500/40 bg-gradient-to-br from-yellow-950/40 via-black/60 to-black/60 p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-yellow-500/10 blur-3xl" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex-1">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-300">
                  <Crown className="h-3 w-3" /> {t("Flagship")}
                </div>
                <h3 className="font-heading text-2xl font-bold text-yellow-300">{t("Owner / Admin Access")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("Become an owner/admin of the ComboWick Discord for 5 full months.")}
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Crown className="h-4 w-4 shrink-0 text-yellow-400" /> {t("Full owner/admin role for 5 months")}</li>
                  <li className="flex items-center gap-2"><Star className="h-4 w-4 shrink-0 text-yellow-400" /> {t("Top of the member list with full server powers")}</li>
                  <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 shrink-0 text-yellow-400" /> {t("Direct line to the founder")}</li>
                </ul>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-4xl font-extrabold text-yellow-300">$1,000</div>
                <p className="text-xs text-muted-foreground">{t("5 months • one-time")}</p>
                <p className="mb-4 mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-400/70">{t("All sales are final — NO REFUNDS")}</p>
                <button
                  onClick={() => setOwnerOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-500 px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-yellow-400"
                >
                  <Crown className="h-4 w-4" /> {t("Claim Owner Access")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div data-pricing-cards className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier, i) => {
              const disc = applyDiscount(tier.price, keyDiscounts?.get(tier.id));
              return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className={`p-6 h-full flex flex-col card-neon ${disc ? "border-green-500/50" : tier.borderColor}`}>
                  <div className="text-center mb-6">
                    {disc ? (
                      <div className="inline-flex items-center rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-green-300 mb-4">
                        {disc.label || t("Limited-Time Sale")}
                      </div>
                    ) : tier.popular && (
                      <div className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-green-300 mb-4">
                        {t("Best Value")}
                      </div>
                    )}
                    <h3 className={`font-heading text-sm font-bold uppercase tracking-wider mb-4 ${tier.color}`}>
                      {t(tier.nameKey)}
                    </h3>
                    {tier.price > 0 ? (
                      <>
                        {disc && (
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="text-lg text-muted-foreground line-through">${tier.price}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-400">{disc.percent}% OFF</span>
                          </div>
                        )}

                        <div className="text-4xl font-bold mb-1">${disc ? disc.final : tier.price}</div>
                        <p className="text-sm text-muted-foreground">{t("Premium Key")}</p>
                        {tier.subtitleKey && <p className="text-xs text-muted-foreground mt-2">{t(tier.subtitleKey)}</p>}
                      </>
                    ) : (
                      <div className="py-4" />
                    )}
                  </div>

                  <ul className="space-y-3 mb-6 flex-1">
                    {tier.featureKeys.map((f, fi) => (
                      <li key={f} className="flex items-center gap-3 text-sm">
                        <FeatureIcon index={fi} />
                        <span>{t(f)}</span>
                      </li>
                    ))}
                  </ul>

                  {tier.subscribeTextKey && (
                    <div className="text-center mb-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                      <p className="text-sm font-semibold text-accent">{t(tier.subscribeTextKey)}</p>
                      <p className="text-xs text-muted-foreground">{t(tier.subscribeSubtextKey!)}</p>
                    </div>
                  )}

                  <Button
                    onClick={() => handlePurchase(tier)}
                    className={`w-full py-5 font-bold ${tier.buttonStyle}`}
                  >
                    {tier.isDiscord && <MessageCircle className="h-4 w-4 mr-2" />}
                    {t(tier.buttonTextKey)}
                  </Button>
                </Card>
              </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Donate / Support — placed right under the pricing cards so it's seen without scrolling */}
      <section className="pt-2 pb-10 sm:pb-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <DonateCard paypalClientId={paypalClientId} />
        </div>
      </section>

      {/* Paid Game Scripts */}
      <section className="py-16 sm:py-20 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl font-bold text-center mb-4">{t("Paid Game Scripts")}</h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            {t("Premium scripts for popular Roblox games. Monthly or lifetime access — fixes pushed regularly.")}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PAID_GAMES.filter((g) => !gameSettings?.get(g.key)?.hidden).map((g) => {
              const setting = gameSettings?.get(g.key);
              const title = overrideText(setting?.title, g.title) || g.title;
              const subtitle = overrideText(setting?.subtitle, g.subtitle) || "";
              const features = setting?.features?.length ? setting.features : g.features;
              const warning = overrideText(setting?.warning, g.warning);
              const monthlyPrice = overridePrice(setting?.monthly_price, g.monthlyPrice) || g.monthlyPrice;
              const lifetimePrice = overridePrice(setting?.lifetime_price, g.lifetimePrice);
              const monthlyNote = overrideText(setting?.monthly_note, g.monthlyNote);
              const lifetimeNote = overrideText(setting?.lifetime_note, g.lifetimeNote);
              const pricing = [
                ...(!setting?.hide_monthly
                  ? [{ price: monthlyPrice, label: t("Monthly"), period: "month" as const, description: t("Renews monthly"), note: monthlyNote }]
                  : []),
                ...(lifetimePrice && !setting?.hide_lifetime
                  ? [{ price: lifetimePrice, label: t("Lifetime"), period: "lifetime" as const, description: t("One-time payment"), note: lifetimeNote }]
                  : []),
              ];
              if (pricing.length === 0) return null;
              return (
                <PaidGameCard
                  key={g.title}
                  game={g.game}
                  title={title}
                  subtitle={subtitle}
                  thumbnail={g.thumbnail}
                  badge={g.badge}
                  features={features}
                  warning={warning}
                  changelog={g.changelog}
                  pricing={pricing}
                  paused={setting?.paused}
                  pauseMessage={setting?.pause_message}
                  onSelectPlan={(plan) => handlePurchase({
                    id: plan.period === "month" ? "monthly" : "lifetime",
                    nameKey: `${title} — ${plan.label}`,
                    price: plan.price,
                    script: g.script,
                    color: "", borderColor: "", featureKeys: [],
                    buttonTextKey: "", buttonStyle: "", isSubscription: false,
                  } as any)}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* What Are Premium Keys */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl font-bold text-center mb-4">{t("What Are Premium Keys?")}</h2>
          <p className="text-muted-foreground text-center max-w-3xl mx-auto mb-12 text-lg leading-relaxed">
            {t("prem_what_desc")}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Unlock, titleKey: "Early Access to New Products", descKey: "prem_early_desc" },
              { icon: Zap, titleKey: "Priority Queue Processing", descKey: "prem_priority_desc" },
              { icon: Shield, titleKey: "Extended Replacement Warranty", descKey: "prem_warranty_desc" },
              { icon: RefreshCw, titleKey: "Auto-Renewal & Notifications", descKey: "prem_renewal_desc" },
              { icon: Award, titleKey: "VIP Discord Channel", descKey: "prem_vip_desc" },
              { icon: Star, titleKey: "Loyalty Rewards Program", descKey: "prem_loyalty_desc" },
            ].map((item) => (
              <Card key={item.titleKey} className="p-6 bg-glass hover:border-primary/30 transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-semibold mb-2">{t(item.titleKey)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(item.descKey)}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl font-bold text-center mb-12">{t("How Premium Keys Work")}</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", titleKey: "Choose a Plan", descKey: "prem_step1_desc" },
              { step: "2", titleKey: "Secure Checkout", descKey: "prem_step2_desc" },
              { step: "3", titleKey: "Receive Your Key", descKey: "prem_step3_desc" },
              { step: "4", titleKey: "Enjoy Benefits", descKey: "prem_step4_desc" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                  <span className="font-heading text-lg font-bold text-primary">{item.step}</span>
                </div>
                <h3 className="font-heading text-base font-semibold mb-2">{t(item.titleKey)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(item.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl font-bold text-center mb-12">{t("Premium Keys FAQ")}</h2>
          <div className="space-y-3">
            <FAQItem q={t("prem_faq1_q")} a={t("prem_faq1_a")} />
            <FAQItem q={t("prem_faq2_q")} a={t("prem_faq2_a")} />
            <FAQItem q={t("prem_faq3_q")} a={t("prem_faq3_a")} />
            <FAQItem q={t("prem_faq4_q")} a={t("prem_faq4_a")} />
            <FAQItem q={t("prem_faq5_q")} a={t("prem_faq5_a")} />
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl font-bold mb-4">{t("Upgrade to Premium Today")}</h2>
          <p className="text-muted-foreground text-lg mb-8">
            {t("prem_cta_desc")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://discord.com/invite/ufrz9Zaqs8" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="text-base px-8 py-6 border-primary/20">
                <MessageCircle className="h-5 w-5 mr-2" /> {t("Join Discord")}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* PayPal Checkout Modal */}
      {selectedTier && paypalClientId && (
        <PayPalCheckoutModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          tier={{
            id: selectedTier.id,
            name: t(selectedTier.nameKey),
            price: selectedTier.price,
            isSubscription: selectedTier.isSubscription,
            subscriptionPrice: selectedTier.subscriptionPrice,
            script: (selectedTier as any).script,
          }}
          paypalClientId={paypalClientId}
        />
      )}
    </Layout>
  );
}
