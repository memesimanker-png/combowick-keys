import { Layout } from "@/components/Layout";
import { Crown, MessageCircle, ArrowRight, Check } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { PayPalCheckoutModal } from "@/components/PayPalCheckoutModal";
import { PaidGameCard } from "@/components/PaidGameCard";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";
import { SEOHead } from "@/components/SEOHead";
import { PAID_GAMES } from "@/lib/paid-games";
import { usePaidGameSettings } from "@/hooks/usePaidGames";
import { useKeyDiscounts, applyDiscount } from "@/hooks/useKeyDiscounts";
import { rememberCodeFromUrl } from "@/lib/creator-code";
import { DonateCard } from "@/components/DonateCard";
import { DiscountNotification } from "@/components/DiscountNotification";
import { OwnerCheckoutModal } from "@/components/OwnerCheckoutModal";
import { BugReportWidget } from "@/components/BugReportWidget";
import { PO_RETURN_KEY } from "@/components/PayoneerOrderForm";
import { useVerifySteps } from "@/components/VerifyShell";

// Premium page v3 (owner-approved mockup mockups/premium-v3.html, 2026-10-29): cowboy art, the $5 trial first and glowing
// (most sales), slim plan rows on phones / three columns on PC, the custom script box right under the plans (free quote,
// no public price), then Free vs Premium and a short FAQ. Removed the old "What are Premium Keys" claims that weren't true.
const DISCORD = "https://discord.com/invite/ufrz9Zaqs8";

const tiers = [
  { id: "trial-7day", nameKey: "7-Day Trial", price: 5, isSubscription: false },
  { id: "monthly", nameKey: "Monthly Access", price: 9.99, isSubscription: false },
  { id: "lifetime", nameKey: "Lifetime Key", price: 49.99, isSubscription: false },
];
type Tier = (typeof tiers)[number] & { script?: string; gameKey?: string; subscriptionPrice?: number };

// what each plan card says (the label/period lines and the PC feature list)
const PLAN_COPY: Record<string, { label: string; period: string; pcLine: string; features: string[]; buy: string; tag?: "pop" | "best" }> = {
  "trial-7day": { label: "7-Day Trial", period: "7 days · one-time", pcLine: "7 days · $0.71 a day · one-time payment", features: ["Every game for 7 days", "No checkpoints, ads or cooldown", "The easy way to try Premium"], buy: "Try for $5", tag: "pop" },
  monthly: { label: "Monthly", period: "30 days · one-time", pcLine: "30 days · $0.33 a day · one-time payment", features: ["Every game for 30 days", "No checkpoints, ads or cooldown", "Priority support"], buy: "Get Monthly" },
  lifetime: { label: "Lifetime", period: "forever · pay once", pcLine: "Pay once. Never expires.", features: ["Every game, forever", "No checkpoints, ads or cooldown", "VIP priority support"], buy: "Get Lifetime", tag: "best" },
};

const overrideText = (value: string | null | undefined, fallback?: string) => (value === null || value === undefined ? fallback : value);
const overridePrice = (value: number | null | undefined, fallback?: number) => {
  if (value === null || value === undefined) return fallback;
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : undefined;
};
const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

// Sale prices are worked out per UTC day (src/lib/auto-key-discounts.ts): a sale ends at the next UTC midnight, and the
// weekend sale (Fri–Sun) is never announced ahead of time.
const nextUtcMidnight = () => {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1);
};
function useCountdown(target: () => number) {
  const calc = () => {
    const s = Math.max(0, Math.floor((target() - Date.now()) / 1000));
    const d = Math.floor(s / 86400);
    const hms = [Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((x) => String(x).padStart(2, "0")).join(":");
    return d > 0 ? `${d}d ${hms}` : hms;
  };
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return left;
}
// "Lifetime {p} off today" -> the percent in bold green, wherever the translation puts it
function withPercent(text: string, p: string) {
  const [a, b = ""] = text.split("{p}");
  return <>{a}<b className="text-green-400" data-no-translate>{p}</b>{b}</>;
}

function FAQItem({ q, a }: { q: string; a: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-secondary/40">
        <span className="font-medium">{q}</span>
        <span className="shrink-0 text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{a}</div>}
    </div>
  );
}

function Tag({ kind, children }: { kind: "pop" | "best" | "quote"; children: ReactNode }) {
  const cls = kind === "pop" ? "bg-green-500/15 text-green-400" : "bg-primary text-primary-foreground";
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${cls}`}>{children}</span>;
}

export default function PremiumKeys() {
  const { t } = useTranslation();
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [paypalClientId, setPaypalClientId] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [checkoutMethod, setCheckoutMethod] = useState<"paypal" | "payoneer">("paypal");
  const { data: gameSettings } = usePaidGameSettings();
  const { data: keyDiscounts } = useKeyDiscounts();
  const steps = useVerifySteps();
  const saleEnds = useCountdown(nextUtcMidnight);
  // paid game scripts the admin hasn't hidden (none = no section and no shortcut box)
  const paidGames = PAID_GAMES.filter((g) => !gameSettings?.get(g.key)?.hidden);

  // creator links: keys.combowick.com/premium-keys?code=ZEN -> pre-filled at checkout
  useEffect(() => { rememberCodeFromUrl(); }, []);
  // back from the Discord sign-in redirect (Payoneer tab of the checkout): reopen it where the buyer left off,
  // once today's discounts are known so the lifetime price matches the sale
  useEffect(() => {
    if (!keyDiscounts) return;
    let plan: string | null = null;
    try { plan = sessionStorage.getItem(PO_RETURN_KEY); } catch { /* ignore */ }
    if (!plan) return;
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user?.identities?.some((x) => x.provider === "discord")) return;
      const tier = tiers.find((x) => x.id === (plan === "lifetime" ? "lifetime" : "monthly"))!;
      const disc = applyDiscount(tier.price, keyDiscounts.get(tier.id));
      setSelectedTier(disc ? { ...tier, price: disc.final } : tier);
      setCheckoutMethod("payoneer");
      setModalOpen(true);
    });
  }, [keyDiscounts]);

  useEffect(() => {
    supabase.functions.invoke("paypal-config").then(({ data }) => {
      if (data?.client_id) setPaypalClientId(data.client_id);
    });
  }, []);

  const handlePurchase = (tier: Tier) => {
    const disc = applyDiscount(tier.price, keyDiscounts?.get(tier.id));
    setSelectedTier(disc ? { ...tier, price: disc.final } : tier);
    setCheckoutMethod("paypal");
    setModalOpen(true);
  };

  const priceOf = (id: string) => {
    const tier = tiers.find((x) => x.id === id)!;
    const disc = applyDiscount(tier.price, keyDiscounts?.get(id));
    return { tier, now: disc ? disc.final : tier.price, was: disc ? tier.price : null, percent: disc?.percent ?? 0 };
  };
  const life = priceOf("lifetime");
  const month = priceOf("monthly");
  const sale = life.percent ? { name: "Lifetime", percent: life.percent } : month.percent ? { name: "Monthly", percent: month.percent } : null;

  // phone: slim rows (trial, lifetime, monthly) · PC: three columns (trial, monthly, lifetime)
  const row = (id: string) => {
    const p = priceOf(id);
    const c = PLAN_COPY[id];
    const inner = (
      <div className={`rounded-[14px] p-3.5 ${id === "lifetime" ? "border-[1.5px] border-primary bg-gradient-to-br from-primary/10 to-card" : id === "trial-7day" ? "bg-gradient-to-br from-primary/15 to-card" : "border border-border bg-card"}`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[13px] font-extrabold uppercase tracking-wider ${id === "monthly" ? "text-muted-foreground" : "text-primary"}`}>{t(c.label)}</span>
          {c.tag === "pop" && <Tag kind="pop">{t("Most popular")}</Tag>}
          {c.tag === "best" && <Tag kind="best">{t("Best value")}</Tag>}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <div data-no-translate>
            <span className="mr-1.5 text-[26px] font-extrabold">{money(p.now)}</span>
            {p.was && <span className="text-[13px] text-muted-foreground line-through">{money(p.was)}</span>}
            <span className="block text-[11.5px] text-muted-foreground">{t(c.period)}</span>
          </div>
          <button onClick={() => handlePurchase(p.tier)}
            className={`h-[42px] shrink-0 rounded-[10px] px-4 text-sm font-extrabold ${id === "monthly" ? "border border-primary/40 font-bold hover:bg-primary/10" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
            {t(c.buy)}
          </button>
        </div>
      </div>
    );
    return id === "trial-7day"
      ? <div key={id} className="cw-glow" style={{ ["--glow-radius" as string]: "14px" }}>{inner}</div>
      : <div key={id}>{inner}</div>;
  };
  const column = (id: string) => {
    const p = priceOf(id);
    const c = PLAN_COPY[id];
    const inner = (
      <div className={`flex h-full flex-col rounded-2xl p-5 ${id === "lifetime" ? "border-[1.5px] border-primary bg-gradient-to-br from-primary/10 to-card" : id === "trial-7day" ? "bg-gradient-to-br from-primary/15 to-card" : "border border-border bg-card"}`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[13px] font-extrabold uppercase tracking-wider ${id === "monthly" ? "text-muted-foreground" : "text-primary"}`}>{t(c.label)}</span>
          {c.tag === "pop" && <Tag kind="pop">{t("Most popular")}</Tag>}
          {c.tag === "best" && <Tag kind="best">{t("Best value")}</Tag>}
        </div>
        <div data-no-translate className="mt-2 flex items-baseline gap-2">
          <span className="text-[34px] font-extrabold">{money(p.now)}</span>
          {p.was && <span className="text-[15px] text-muted-foreground line-through">{money(p.was)}</span>}
          {p.percent > 0 && <span className="rounded-md bg-green-500/15 px-1.5 py-0.5 text-[11px] font-extrabold text-green-400">{p.percent}% OFF</span>}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{t(c.pcLine)}</p>
        <ul className="my-4 grid gap-1.5 text-[13px]">
          {c.features.map((f) => <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{t(f)}</li>)}
        </ul>
        <button onClick={() => handlePurchase(p.tier)}
          className={`mt-auto h-[46px] rounded-[11px] text-[15px] font-extrabold ${id === "monthly" ? "border border-primary/40 font-bold hover:bg-primary/10" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
          {t(c.buy)}
        </button>
      </div>
    );
    return id === "trial-7day"
      ? <div key={id} className="cw-glow h-full" style={{ ["--glow-radius" as string]: "16px" }}>{inner}</div>
      : <div key={id} className="h-full">{inner}</div>;
  };

  const chips = [
    { emoji: "⚡", text: t("Key in seconds") },
    { emoji: "📧", text: t("Also sent by email") },
    { emoji: "💬", text: t("Discord support") },
    { emoji: "🔒", text: `PayPal · ${t("Card")} · Payoneer`, pcOnly: true },
  ];
  // sale on: today's real % and when it ends · no sale: push the $5 trial (never tease the weekend sale on a
  // weekday, that just teaches buyers to wait; owner 2026-10-29)
  const saleBar = (
    <div className="cw-glow" style={{ ["--glow-radius" as string]: "12px" }}>
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
        <span className="text-[13px] font-semibold">
          {sale
            ? <>🔥 {withPercent(t(sale.name === "Lifetime" ? "Lifetime {p} off today" : "Monthly {p} off today"), `${sale.percent}%`)}{sale.name === "Lifetime" && <span className="hidden lg:inline"> {t("Pay once. Never expires.")}</span>}</>
            : <>⚡ {withPercent(t("Every game for 7 days, just {p}"), "$5")}</>}
        </span>
        {sale
          ? <span data-no-translate className="whitespace-nowrap rounded-lg border border-primary/40 bg-background px-2 py-1 font-mono text-[13px] font-bold text-primary">{saleEnds}</span>
          : <button onClick={() => handlePurchase(tiers[0])} className="whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-extrabold text-primary-foreground hover:bg-primary/90">{t("Try for $5")}</button>}
      </div>
    </div>
  );

  return (
    <Layout>
      <DiscountNotification />
      <OwnerCheckoutModal isOpen={ownerOpen} onClose={() => setOwnerOpen(false)} paypalClientId={paypalClientId} />
      <SEOHead
        title="ComboWick Premium Keys — Plans from $5"
        description="Buy a ComboWick premium key. 7-day trial $5, monthly $9.99, lifetime $49.99 (often on sale). One key for every game, no checkpoints. Pay with PayPal, card or Payoneer."
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Premium Keys", url: "/premium-keys" }]}
      />

      <section className="mx-auto max-w-[1080px] px-4 pb-6 pt-5 sm:px-6 lg:px-10 lg:pt-10">
        {/* hero: phone = big square art, title under it · PC = title left, art right */}
        <div className="lg:grid lg:grid-cols-[1fr_440px] lg:items-center lg:gap-8">
          <div className="order-2 lg:order-1">
            <div className="mb-4 overflow-hidden rounded-2xl border border-primary/35 lg:hidden">
              <img src="/images/premium-cowboy.webp" alt="COMBO_WICK" className="aspect-square w-full object-cover" />
            </div>
            <div className="text-center lg:text-left">
              <h1 className="font-heading text-[30px] font-bold text-gradient-primary sm:text-[40px]">{t("Premium Key")}</h1>
              <p className="mt-1.5 text-sm text-foreground/85 sm:text-base">{t("One key. Every game. No checkpoints, no ads, no cooldown.")}</p>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 lg:justify-start">
              {chips.map((c) => (
                <span key={c.emoji} className={`items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-foreground/85 ${c.pcOnly ? "hidden lg:inline-flex" : "inline-flex"}`}>
                  <span aria-hidden>{c.emoji}</span>{c.text}
                </span>
              ))}
            </div>
            <div className="mt-4">{saleBar}</div>
          </div>
          <div className="cw-glow hidden lg:order-2 lg:block" style={{ ["--glow-radius" as string]: "18px" }}>
            <img src="/images/premium-cowboy.webp" alt="COMBO_WICK" className="aspect-square w-full rounded-[16px] object-cover" />
          </div>
        </div>

        {/* plans */}
        <div data-pricing-cards className="scroll-mt-20">
          <div className="mt-4 grid gap-2.5 lg:hidden">
            {["trial-7day", "lifetime", "monthly"].map(row)}
            <p className="text-center text-[11.5px] text-muted-foreground">{t("Every plan: all games, no checkpoints, no ads, no cooldown.")}</p>
          </div>
          <div className="mt-6 hidden grid-cols-3 items-stretch gap-[18px] lg:grid">
            {["trial-7day", "monthly", "lifetime"].map(column)}
          </div>
        </div>

        {/* custom scripts: right under the plans, free quote (no public price) */}
        <a href={DISCORD} target="_blank" rel="noopener noreferrer" className="cw-glow mt-4 block lg:mt-5" style={{ ["--glow-radius" as string]: "16px" }}>
          <div className="px-4 py-3.5 lg:flex lg:items-center lg:justify-between lg:gap-5">
            <div>
              <div className="flex items-center justify-between gap-2 lg:justify-start lg:gap-2.5">
                <b className="flex items-center gap-1.5 text-sm"><span aria-hidden>👑</span>{t("Want a script for your own game?")}</b>
                <Tag kind="quote">{t("Free quote")}</Tag>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("Your own script with your features, built before every free request.")}</p>
            </div>
            <span className="mt-2.5 flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-primary px-5 text-[13.5px] font-extrabold text-primary-foreground lg:mt-0 lg:shrink-0">
              {t("Get a price on Discord")} <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </a>

        {/* how to pay */}
        <div className="mt-4 text-center">
          <div className="flex flex-wrap justify-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11.5px] font-semibold"><span aria-hidden>🔒</span>PayPal</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11.5px] font-semibold"><span aria-hidden>💳</span>{t("Card")}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11.5px] font-semibold"><span aria-hidden>🟠</span>Payoneer</span>
          </div>
          <p className="mx-auto mt-2 max-w-xl text-[11.5px] leading-relaxed text-muted-foreground">{t("No PayPal? Pick Payoneer at checkout (Lifetime, or 60 days for $21.99). Got a creator code? Add it at checkout.")}</p>
        </div>

        {/* Free vs Premium + questions */}
        <div className="mt-5 grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <h2 className="px-4 pb-2.5 pt-3.5 font-heading text-base font-bold">{t("Free vs Premium")}</h2>
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-t border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-bold" /><th className="px-3 py-2 font-bold">{t("Free key")}</th><th className="px-3 py-2 font-bold">{t("Premium")}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Checkpoints", t("{n} each time").replace("{n}", String(steps)), t("None")],
                  ["Key lasts", t("8 hours"), t("7 days → forever")],
                  ["Games", t("1 per key"), t("Every game")],
                  ["Ads", t("Yes"), t("None")],
                  ["Wait between keys", t("1 hour"), t("Never")],
                ].map(([k, free, prem]) => (
                  <tr key={k} className="border-t border-border">
                    <td className="px-3 py-2">{t(k)}</td><td className="px-3 py-2 text-muted-foreground">{free}</td><td className="px-3 py-2 font-bold text-primary">{prem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <h2 className="px-4 pb-2.5 pt-3.5 font-heading text-base font-bold">{t("Questions")}</h2>
              <FAQItem q={t("How fast do I get my key?")} a={t("With PayPal or card, right away: it shows on the screen and is sent to your email. With Payoneer, it unlocks as soon as the payment clears and comes to your Discord DMs, email and order page.")} />
              <FAQItem q={t("Does it work on my phone and PC?")} a={t("Yes. Run the script on any supported executor, phone or PC, and paste your key in the Premium Key tab. The key locks to the first device you use it on.")} />
              <FAQItem q={t("What if my key stops working?")} a={<>{t("Use Fix Key on the website or open a ticket in our Discord and we'll sort it out.")} <a href="/fix-key" className="text-primary underline">{t("Fix Key")}</a></>} />
              <FAQItem q={t("Can I get a refund?")} a={<>{t("Keys are digital and delivered instantly, so sales are final. If your key is broken and we can't fix it, we replace it.")} <a href="/refund-policy" className="text-primary underline">{t("Refund Policy")}</a></>} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {/* no paid game listed right now -> ask about one on Discord */}
              <a href={paidGames.length ? "#paid-scripts" : DISCORD} {...(paidGames.length ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                className="rounded-xl border border-border bg-secondary p-3 text-xs hover:border-primary/40">
                <b className="mb-0.5 flex items-center gap-1.5 text-[13px]"><span aria-hidden>🎮</span>{t("Paid game scripts")}</b>
                <span className="text-muted-foreground">{t("Premium scripts for one game")} →</span>
              </a>
              <a href="#support-us" className="rounded-xl border border-border bg-secondary p-3 text-xs hover:border-primary/40">
                <b className="mb-0.5 flex items-center gap-1.5 text-[13px]"><span aria-hidden>❤️</span>{t("Support us")}</b>
                <span className="text-muted-foreground">{t("Donate or Owner access")} →</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Paid game scripts (kept, lower on the page) */}
      {paidGames.length > 0 && <section id="paid-scripts" className="scroll-mt-20 bg-muted/20 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-3 text-center font-heading text-3xl font-bold">{t("Paid Game Scripts")}</h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-muted-foreground">
            {t("Premium scripts for popular Roblox games. Monthly or lifetime access — fixes pushed regularly.")}
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {paidGames.map((g) => {
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
                    gameKey: g.key,
                    isSubscription: false,
                  })}
                />
              );
            })}
          </div>
        </div>
      </section>}

      {/* Support us: donate + Owner / Admin access */}
      <section id="support-us" className="scroll-mt-20 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-yellow-500/40 bg-gradient-to-br from-yellow-950/40 via-black/60 to-black/60 p-6 sm:p-8">
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex-1">
                <h3 className="font-heading text-2xl font-bold text-yellow-300">{t("Owner / Admin Access")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t("Become an owner/admin of the ComboWick Discord for 5 full months.")}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Crown className="h-4 w-4 shrink-0 text-yellow-400" /> {t("Full owner/admin role for 5 months")}</li>
                  <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 shrink-0 text-yellow-400" /> {t("Direct line to the founder")}</li>
                </ul>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-4xl font-extrabold text-yellow-300">$500</div>
                <p className="text-xs text-muted-foreground">{t("5 months • one-time")}</p>
                <p className="mb-4 mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-400/70">{t("All sales are final — NO REFUNDS")}</p>
                <button onClick={() => setOwnerOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-500 px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-yellow-400">
                  <Crown className="h-4 w-4" /> {t("Claim Owner Access")}
                </button>
              </div>
            </div>
          </div>
          <div className="mx-auto max-w-3xl"><DonateCard paypalClientId={paypalClientId} /></div>
        </div>
      </section>

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
            script: selectedTier.script,
            gameKey: selectedTier.gameKey,
          }}
          paypalClientId={paypalClientId}
          initialMethod={checkoutMethod}
        />
      )}
      <BugReportWidget page="premium-key" />
    </Layout>
  );
}
