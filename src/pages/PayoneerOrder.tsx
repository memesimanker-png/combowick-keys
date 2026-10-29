import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, ExternalLink, Loader2, XCircle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";
import { VerifyCard, VerifyHeader } from "@/components/VerifyShell";
import { DiscordSignInButton } from "@/components/DiscordSignInButton";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";

// Payoneer order page (v3, 2026-10-29). The bot DMs the buyer a card with Pay now (Payoneer doesn't allow payment
// links on a website). Pressing Pay now starts a 30-minute server-side "Verifying your payment" window, so this page
// keeps showing it after a refresh while staff check Payoneer. Approve -> the key shows here (and DM + email).
type Order = {
  id: number; plan: "60d" | "lifetime"; price: number; status: string; created_at: string;
  card: string | null; dm: boolean; link_ready: boolean; pay_pressed: boolean; verifying: boolean;
  temp_key: string | null; key: string | null;
};

const PLAN_NAME: Record<string, string> = { "60d": "60 Days Key", lifetime: "Lifetime Key" };

// ?preview=<state> shows each screen with sample data (no sign-in), so the owner can look at them
const PREVIEW_BASE: Order = {
  id: 1234, plan: "60d", price: 21.99, status: "pending", created_at: "", card: "https://discord.com/channels/@me", dm: true,
  link_ready: true, pay_pressed: false, verifying: false, temp_key: null, key: null,
};
const PREVIEWS: Record<string, Partial<Order>> = {
  waiting: {},
  verifying: { pay_pressed: true, verifying: true },
  still: { pay_pressed: true, temp_key: "CW-SAMPLE-24H-KEY" },
  paid: { status: "approved", key: "CW-SAMPLE-FULL-KEY" },
  cancelled: { status: "denied" },
  expired: { status: "expired" },
};

function KeyBox({ value, tone }: { value: string; tone: "green" | "gold" }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };
  return (
    <div className="flex items-center justify-center gap-2">
      <code data-no-translate className={`break-all rounded-lg bg-background px-3 py-2 font-mono text-sm sm:text-base ${tone === "gold" ? "text-primary" : ""}`}>{value}</code>
      <button onClick={copy} className="shrink-0 rounded-lg border border-border p-2 hover:bg-secondary" aria-label={t("Copy")}>
        {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function PayoneerOrder() {
  const { t } = useTranslation();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  const load = useCallback(async () => {
    const { data } = await supabase.functions.invoke("payoneer-order", { body: { action: "status" } });
    if (data?.error === "sign_in" || data?.error === "discord_required") { setSignedIn(false); return; }
    setOrder(data?.order ?? null);
  }, []);

  const preview = new URLSearchParams(window.location.search).get("preview");
  useEffect(() => {
    if (preview && PREVIEWS[preview]) {
      setSignedIn(true);
      setOrder({ ...PREVIEW_BASE, ...PREVIEWS[preview] });
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const ok = !!data.session?.user?.identities?.some((x) => x.provider === "discord");
      setSignedIn(ok);
      if (ok) load();
    });
  }, [load, preview]);

  // keep checking until the order is finished (every 8s while verifying, else every 20s)
  useEffect(() => {
    if (preview || !order || ["approved", "denied"].includes(order.status) || (order.status === "expired" && !order.pay_pressed)) return;
    const id = setInterval(load, order.verifying ? 8000 : 20000);
    return () => clearInterval(id);
  }, [order, load, preview]);

  const o = order;
  const done = o?.status === "approved";
  const percent = !o ? 0 : done ? 100 : o.verifying ? 75 : o.pay_pressed ? 85 : 40;
  const openDiscord = o?.card && (
    <a href={o.card} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4752C4]">
      <ExternalLink className="h-4 w-4" /> {o.dm ? t("Open my Discord DMs") : t("Open my ticket")}
    </a>
  );

  return (
    <Layout>
      <SEOHead title="Your Payoneer Order — Combo_WICK" description="Track your Payoneer order and get your premium key." />
      <section className="px-4 py-10 sm:py-14">
        {preview && PREVIEWS[preview] && (
          <div data-no-translate className="mx-auto mb-4 flex max-w-3xl flex-wrap items-center gap-2 rounded-lg border border-dashed border-primary/40 p-2 text-xs">
            <span className="font-bold text-primary">Preview:</span>
            {Object.keys(PREVIEWS).map((k) => (
              <a key={k} href={`?preview=${k}`} className={`rounded px-2 py-1 ${k === preview ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"}`}>{k}</a>
            ))}
          </div>
        )}
        <VerifyCard>
          <VerifyHeader
            title={done ? t("Your Key Is Ready") : t("Your Payoneer Order")}
            sub={o ? `${t(PLAN_NAME[o.plan] || o.plan)} · $${o.price.toFixed(2)} · ${t("Order")} #${o.id}` : t("Pay with Payoneer")}
            percent={percent}
          />
          <div className="space-y-4 p-4 sm:p-7">
            {signedIn === null || (signedIn && order === undefined) ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : !signedIn ? (
              <div className="mx-auto max-w-sm space-y-3 py-4 text-center">
                <p className="text-sm text-muted-foreground">{t("Sign in with the Discord account you ordered with.")}</p>
                <DiscordSignInButton label={t("Sign in with Discord")} redirectPath="/payoneer-order" />
              </div>
            ) : !o ? (
              <div className="space-y-3 py-6 text-center">
                <p className="text-sm text-muted-foreground">{t("You don't have a Payoneer order yet.")}</p>
                <Link to="/premium-keys" className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">{t("See Premium plans")}</Link>
              </div>
            ) : done ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-center">
                  <p className="mb-2 text-sm text-green-300">{t("Payment confirmed. Thanks for your purchase!")}</p>
                  {o.key && <KeyBox value={o.key} tone="green" />}
                </div>
                <p className="text-center text-xs text-muted-foreground">{t("Run the script in any supported game and paste the key in the Premium Key tab. We also sent it to your Discord DMs and your email.")}</p>
              </div>
            ) : o.status === "denied" ? (
              <div className="space-y-3 py-4 text-center">
                <XCircle className="mx-auto h-8 w-8 text-destructive" />
                <p className="text-sm">{t("We couldn't find your payment, so this order was cancelled.")}</p>
                <p className="text-xs text-muted-foreground">{t("If you did pay, open a ticket in our Discord.")}</p>
              </div>
            ) : o.status === "expired" && !o.pay_pressed ? (
              <div className="space-y-3 py-4 text-center">
                <p className="text-sm">{t("This order expired because it wasn't paid within 48 hours. Please don't pay the old link anymore.")}</p>
                <Link to="/premium-keys" className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">{t("Order again")}</Link>
              </div>
            ) : o.pay_pressed ? (
              // verifying (first 30 minutes after Pay now) or still verifying after that
              <div className="space-y-4 py-4 text-center">
                <div className="relative mx-auto h-20 w-20">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/15" />
                  <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" style={{ animationDuration: "1.1s" }} />
                  <div className="absolute inset-3 animate-pulse rounded-full bg-primary/10" />
                </div>
                <div>
                  <p className="text-lg font-bold">{o.verifying ? t("Verifying your payment…") : t("Still verifying…")}</p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                    {o.verifying
                      ? t("Payments can take a bit to verify, so please sit tight.")
                      : t("Some payments take longer. Your key comes to your Discord DMs and here the moment it's confirmed.")}
                  </p>
                </div>
                {o.temp_key && (
                  <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
                    <p className="mb-2 text-sm">{t("Play right now with this 24-hour key:")}</p>
                    <KeyBox value={o.temp_key} tone="gold" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{t("You can leave this page. Your key also comes to your Discord DMs.")}</p>
              </div>
            ) : (
              // ordered, not paid yet: the Pay now button is in their Discord DMs
              <div className="space-y-4 py-2 text-center">
                <p className="text-sm font-semibold">{o.link_ready ? (o.dm ? t("Your payment link is in your Discord DMs.") : t("Your payment link is in your Discord ticket.")) : t("Your payment link is on its way.")}</p>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  {t("Press Pay now there and pay on Payoneer. That's it! This page then shows your payment being verified.")}
                  {o.plan === "lifetime" && <> {t("Type exactly this amount on the Payoneer page:")} <b data-no-translate className="text-foreground">{o.price.toFixed(2)} USD</b></>}
                </p>
                {openDiscord}
              </div>
            )}
          </div>
        </VerifyCard>
      </section>
    </Layout>
  );
}
