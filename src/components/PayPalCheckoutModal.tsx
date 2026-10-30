import { useState, useEffect } from "react";
import { PayPalScriptProvider, PayPalButtons, FUNDING } from "@paypal/react-paypal-js";
import { X, Loader2, CheckCircle, Zap, Lock, CreditCard, Clock, Check, Gift, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";
import { PayoneerOrderForm, PAYONEER_PLANS, PO_RETURN_KEY } from "@/components/PayoneerOrderForm";
import { checkCreatorCode, savedCode, saveCode, withCode, type CheckoutCode } from "@/lib/creator-code";
import { saleSource } from "@/lib/sale-source";

// PayPal's cut on a $5 sale is $0.57 (5.4% + $0.30), so the trial's checkout adds this line; the page still says $5.
// KEEP IN SYNC with PAYPAL_FEE in supabase/functions/_shared/key-pricing.ts (the server refuses less).
const PAYPAL_FEE: Record<string, number> = { "trial-7day": 0.49 };

interface PayPalCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: {
    id: string;
    name: string;
    price: number;
    isSubscription?: boolean;
    subscriptionPrice?: number;
    script?: string;
    /** paid-game script purchases: which game (the server prices the order from it) */
    gameKey?: string;
  };
  paypalClientId: string;
  initialMethod?: "paypal" | "payoneer";
}

export function PayPalCheckoutModal({ isOpen, onClose, tier, paypalClientId, initialMethod = "paypal" }: PayPalCheckoutModalProps) {
  const { t } = useTranslation();
  // PayPal/card checks out here; Payoneer opens a Discord ticket (Payoneer needs $20+, so the lifetime key keeps its
  // plan at today's sale price and the cheaper keys become the 60-day pack). Paid-game scripts stay PayPal-only.
  const payoneerOk = !tier.script && !tier.isSubscription;
  const payoneerPlan = tier.id === "lifetime" ? "lifetime" : "60d";
  const payoneerPrice = payoneerPlan === "lifetime" ? Math.max(20, tier.price) : PAYONEER_PLANS["60d"].price;
  const [method, setMethod] = useState<"paypal" | "payoneer">(initialMethod);
  useEffect(() => { if (isOpen) setMethod(payoneerOk ? initialMethod : "paypal"); }, [isOpen, initialMethod, payoneerOk]);
  const onPayoneer = method === "payoneer" && payoneerOk;
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [pending, setPending] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState<{ key: string; expires_at: string } | null>(null);
  // No tabs anymore — for subscription tiers we default to auto-renew (the highlighted offer)
  // and let users pick "one-time" via a card click. State drives the PayPal button rendered.
  const [paymentType, setPaymentType] = useState<"onetime" | "subscription">(
    tier.isSubscription ? "subscription" : "onetime"
  );
  const [planId, setPlanId] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  // Creator code or promo coupon: Premium monthly/lifetime by PayPal/card only. The server re-checks the code and the price.
  const codeEligible = !tier.script && !tier.isSubscription && (tier.id === "monthly" || tier.id === "lifetime");
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState<CheckoutCode | null>(null);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  useEffect(() => {
    if (!isOpen || !codeEligible) return;
    const s = savedCode();   // from a creator's ?code= link
    if (!s) return;
    setCodeInput(s);
    checkCreatorCode(s).then((c) => { if (c) setCode(c); else saveCode(null); });
  }, [isOpen, codeEligible]);
  const applyCode = async () => {
    setCodeBusy(true);
    setCodeMsg(null);
    const c = await checkCreatorCode(codeInput);
    setCodeBusy(false);
    if (c) { setCode(c); saveCode(c.code); } else { setCode(null); setCodeMsg(t("That code doesn't exist or has expired.")); }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setProcessing(false);
      setPending(false);
      setPendingOrderId(null);
      setCopied(false);
      setPlanId(null);
      setPaymentType(tier.isSubscription ? "subscription" : "onetime");
      // Restore last key for this tier if the modal was accidentally re-opened
      // right after a successful purchase (PayPal redirect can briefly steal focus).
      try {
        const cached = localStorage.getItem(`last_purchase_${tier.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.key && Date.now() - (parsed.savedAt || 0) < 10 * 60 * 1000) {
            setSuccess({ key: parsed.key, expires_at: parsed.expires_at });
            return;
          }
        }
      } catch {}
      setSuccess(null);
    }
  }, [isOpen, tier]);

  // While an eCheck is clearing, poll the buyer's purchase record. The webhook
  // flips it to completed + writes the key once funds clear, so this modal
  // upgrades itself from "pending" to the success screen with no refresh.
  useEffect(() => {
    if (!pendingOrderId) return;
    let active = true;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("premium_key_purchases")
        .select("status,key_generated,expires_at")
        .eq("payment_id", pendingOrderId)
        .maybeSingle();
      if (!active || !data) return;
      if (data.status === "completed" && data.key_generated) {
        persistKey(data.key_generated, data.expires_at as string);
        setSuccess({ key: data.key_generated, expires_at: data.expires_at as string });
        setPending(false);
        setPendingOrderId(null);
      } else if (data.status === "failed") {
        setError(t("Payment was declined or reversed. You have not been charged."));
        setPending(false);
        setPendingOrderId(null);
      }
    }, 8000);
    return () => { active = false; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOrderId]);

  // Lock background scroll + allow Escape to dismiss (but never mid-payment or
  // while a result screen is showing — guarded the same way as the overlay click).
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !processing && !success && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, processing, success, pending, onClose]);





  useEffect(() => {
    if (!isOpen || paymentType !== "subscription" || !tier.isSubscription) return;
    const price = tier.subscriptionPrice || tier.price;
    setLoadingPlan(true);
    supabase.functions.invoke("paypal-create-subscription", { body: { amount: price } })
      .then(({ data, error: fnError }) => {
        if (fnError || !data?.plan_id) {
          setError("Failed to load subscription plan. Please try again.");
        } else {
          setPlanId(data.plan_id);
        }
      })
      .finally(() => setLoadingPlan(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, paymentType, tier.id, tier.subscriptionPrice, tier.price]);

  if (!isOpen) return null;

  const isSubscription = paymentType === "subscription" && tier.isSubscription;
  const basePrice = isSubscription ? (tier.subscriptionPrice || tier.price) : tier.price;
  const codeOn = !!code && codeEligible && !isSubscription;
  const displayPrice = codeOn ? withCode(basePrice, code!.discount_pct) : basePrice;
  // PayPal fee added at checkout (the $5 trial only; the page keeps showing $5). Same number as the server's PAYPAL_FEE.
  const paypalFee = !isSubscription && !tier.script ? (PAYPAL_FEE[tier.id] ?? 0) : 0;
  const chargePrice = Math.round((displayPrice + paypalFee) * 100) / 100;

  const createOrderHandler = async () => {
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("paypal-create-order", {
        body: {
          amount: chargePrice, tier: tier.id, game: tier.gameKey, description: `${tier.name} Premium Key`,
          creator_code: codeOn && code!.kind === "creator" ? code!.code : undefined,
          promo_code: codeOn && code!.kind === "promo" ? code!.code : undefined,
        },
      });
      if (fnError || !data?.order_id) throw new Error("Failed to create order");
      return data.order_id;
    } catch (err: any) {
      setError(err.message || t("modal_generic_error"));
      throw err;
    }
  };

  const createSubscriptionHandler = async (_data: any, actions: any) => {
    if (!planId) throw new Error("Plan not loaded");
    return actions.subscription.create({ plan_id: planId });
  };

  const persistKey = (key: string, expires_at: string) => {
    try {
      localStorage.setItem(
        `last_purchase_${tier.id}`,
        JSON.stringify({ key, expires_at, savedAt: Date.now() })
      );
    } catch {}
  };

  const captureHandler = async (data: any) => {
    setProcessing(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;

      if (isSubscription) {
        const { data: result, error: fnError } = await supabase.functions.invoke(
          "paypal-activate-subscription",
          {
            body: {
              subscription_id: data.subscriptionID,
              tier: "monthly",
              amount: displayPrice,
              customer_email: user?.email || null,
              user_id: user?.id || null,
            },
          }
        );
        if (fnError) throw new Error("Subscription activation failed");
        // eCheck / unfunded first cycle: no key issued until funds clear.
        if (result?.pending || result?.status === "PENDING") {
          setPending(true);
          setPendingOrderId(data.subscriptionID);
          return;
        }
        persistKey(result.key, result.expires_at);
        setSuccess({ key: result.key, expires_at: result.expires_at });
      } else {
        const { data: result, error: fnError } = await supabase.functions.invoke(
          "paypal-capture-order",
          {
            body: {
              order_id: data.orderID,
              tier: tier.id,
              amount: chargePrice,
              source: saleSource(),
              customer_email: user?.email || null,
              user_id: user?.id || null,
            },
          }
        );
        if (fnError) throw new Error("Payment capture failed");
        // eCheck / pending payments: funds haven't cleared yet, so no key is issued.
        if (result?.pending || result?.status === "PENDING") {
          setPending(true);
          setPendingOrderId(data.orderID);
          return;
        }
        persistKey(result.key, result.expires_at);
        setSuccess({ key: result.key, expires_at: result.expires_at });
      }
    } catch {
      setError(t("modal_capture_error"));
    } finally {
      setProcessing(false);
    }
  };

  // Block accidental close while we're mid-payment OR a result screen is up.
  const guardedClose = () => {
    if (processing || success || pending) return;
    try { sessionStorage.removeItem(PO_RETURN_KEY); } catch { /* ignore */ }
    onClose();
  };

  const dismissSuccess = () => {
    try { localStorage.removeItem(`last_purchase_${tier.id}`); } catch {}
    setSuccess(null);
    setPending(false);
    setPendingOrderId(null);
    onClose();
  };

  const copyKey = () => {
    if (success?.key) {
      navigator.clipboard.writeText(success.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={guardedClose} />
      <div
        className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary/40" />
        <div className="p-6">
          <button
            onClick={(success || pending) ? dismissSuccess : guardedClose}
            disabled={processing}
            className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors rounded-full p-1.5 hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>


          {pending ? (
            <div className="text-center py-6">
              <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-heading text-xl font-bold mb-2">{t("Payment Processing")}</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {t("Your payment is an eCheck and is still clearing. This can take a few business days. As soon as the funds clear, your license key will be emailed to you and added to your dashboard automatically — no key is issued before then.")}
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-primary mb-4">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("Watching for your payment to clear — this screen will update on its own.")}
              </div>
              <button onClick={dismissSuccess} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
                {t("Got it")}
              </button>
            </div>
          ) : success ? (
            <div className="text-center py-6">
              <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h2 className="font-heading text-xl font-bold mb-2">{t("Payment Successful!")}</h2>
              <p className="text-sm text-muted-foreground mb-6">{t("modal_key_generated")}</p>
              <div className="bg-background/50 backdrop-blur-sm p-4 rounded-lg mb-4 border border-primary/30">
                <p className="text-xs text-muted-foreground mb-2 font-medium">{t("Your License Key:")}</p>
                <code className="text-sm font-mono break-all font-semibold text-primary select-all">{success.key}</code>
              </div>
              <button onClick={copyKey} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold mb-2 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                {copied ? <><Check className="h-4 w-4" /> {t("Copied!")}</> : t("Copy Key")}
              </button>
              <button onClick={dismissSuccess} className="w-full py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm mb-3 hover:bg-secondary/80 transition-colors">
                {t("Done")}
              </button>
              <p className="text-xs text-muted-foreground">{t("Expires:")} {new Date(success.expires_at).toLocaleDateString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("modal_key_saved_dashboard")}</p>
              {tier.script && (
                <div className="mt-5 text-left bg-background/50 backdrop-blur-sm p-4 rounded-lg border border-primary/30">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">{t("Your Script (run with your key):")}</p>
                  <code className="block text-[11px] font-mono break-all text-primary select-all mb-3">{tier.script}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(tier.script!); }}
                    className="w-full py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-secondary/80 transition-colors"
                  >
                    {t("Copy Script")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="text-center mb-5">
                <h2 className="font-heading text-xl font-bold">{onPayoneer ? t(PAYONEER_PLANS[payoneerPlan].name) : tier.name}</h2>
                <div className="mt-2 inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1" data-no-translate>
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  {!onPayoneer && codeOn && <span className="text-muted-foreground line-through text-sm">${basePrice}</span>}
                  <span className="text-primary font-bold text-lg">${onPayoneer ? payoneerPrice : displayPrice}</span>
                  <span className="text-muted-foreground text-sm">{isSubscription ? t("/month") : t(" one-time")}</span>
                </div>
              </div>

              {payoneerOk && (
                <div className="mb-5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">{t("Payment method")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { id: "paypal", label: t("PayPal / Card"), sub: t("Instant key") },
                      { id: "payoneer", label: "Payoneer", sub: t("Automatic key") },
                    ] as const).map((m) => (
                      <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                        className={`rounded-lg border p-3 text-left transition-all ${method === m.id ? "border-primary bg-primary/15" : "border-border bg-secondary/40 hover:bg-secondary"}`}>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${method === m.id ? "border-primary bg-primary" : "border-muted-foreground/50"}`} />
                          {m.label}
                        </div>
                        <div className="mt-1 pl-[22px] text-[11px] leading-snug text-muted-foreground">{m.sub}</div>
                      </button>
                    ))}
                    <div aria-disabled="true" className="col-span-2 flex cursor-not-allowed items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-secondary/20 px-3 py-2.5 opacity-70">
                      <span className="flex items-center gap-2 text-sm font-semibold"><Gift className="h-4 w-4 text-primary" /> {t("Gift card")}</span>
                      <span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">{t("Coming soon")}</span>
                    </div>
                  </div>
                  {onPayoneer && payoneerPlan === "60d" && (
                    <p className="mt-3 text-center text-[11.5px] text-muted-foreground">
                      {t("With Payoneer you get 2 months of every game.")}
                    </p>
                  )}
                </div>
              )}

              {onPayoneer ? (
                <PayoneerOrderForm plan={payoneerPlan} price={payoneerPrice} />
              ) : (<>
              {tier.isSubscription && (
                <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 p-3" data-no-translate>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 text-center">{t("Choose your plan")}</p>
                  <div className="space-y-2">
                    <label
                      className={`flex items-center justify-between gap-3 rounded-lg p-3 cursor-pointer transition-all border ${paymentType === "subscription" ? "border-primary bg-primary/15" : "border-border bg-secondary/40 hover:bg-secondary"}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment-plan"
                          checked={paymentType === "subscription"}
                          onChange={() => setPaymentType("subscription")}
                          className="h-4 w-4 accent-primary"
                        />
                        <div>
                          <div className="text-sm font-semibold flex items-center gap-2">
                            {t("Auto-Renew")}
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary text-primary-foreground">{t("Best value")}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{t("Cancel anytime in PayPal")}</div>
                        </div>
                      </div>
                      <div className="text-base font-bold whitespace-nowrap">${tier.subscriptionPrice}<span className="text-[11px] font-normal text-muted-foreground">/{t("mo")}</span></div>
                    </label>
                    <label
                      className={`flex items-center justify-between gap-3 rounded-lg p-3 cursor-pointer transition-all border ${paymentType === "onetime" ? "border-primary bg-primary/15" : "border-border bg-secondary/40 hover:bg-secondary"}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment-plan"
                          checked={paymentType === "onetime"}
                          onChange={() => setPaymentType("onetime")}
                          className="h-4 w-4 accent-primary"
                        />
                        <div>
                          <div className="text-sm font-semibold">{t("One-Time")}</div>
                          <div className="text-[11px] text-muted-foreground">{t("Single 30-day key, no renewal")}</div>
                        </div>
                      </div>
                      <div className="text-base font-bold whitespace-nowrap">${tier.price}<span className="text-[11px] font-normal text-muted-foreground">/{t("mo")}</span></div>
                    </label>
                  </div>
                </div>
              )}

              {codeEligible && !onPayoneer && (
                <div className="mb-4">
                  {codeOn ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs">
                      <span className="flex items-center gap-1.5 text-green-400"><Tag className="w-3.5 h-3.5" /> {t(code!.kind === "promo" ? "Promo code {code}: {pct}% off" : "Creator code {code}: {pct}% off").replace("{code}", code!.code).replace("{pct}", String(code!.discount_pct))}</span>
                      <button type="button" className="text-muted-foreground hover:text-foreground underline" onClick={() => { setCode(null); saveCode(null); setCodeInput(""); }}>{t("Remove")}</button>
                    </div>
                  ) : codeOpen ? (
                    <div>
                      <div className="flex gap-2">
                        <input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") applyCode(); }}
                          placeholder={t("Creator code")} maxLength={20} data-no-translate
                          className="flex-1 min-w-0 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm uppercase tracking-wider focus:outline-none focus:border-primary" />
                        <button type="button" disabled={codeBusy || codeInput.trim().length < 3} onClick={applyCode}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                          {codeBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Apply")}
                        </button>
                      </div>
                      {codeMsg && <p className="mt-1.5 text-xs text-destructive">{codeMsg}</p>}
                    </div>
                  ) : (
                    <button type="button" onClick={() => setCodeOpen(true)} className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
                      <Tag className="w-3.5 h-3.5" /> {t("Have a creator code?")}
                    </button>
                  )}
                </div>
              )}

              <div className="bg-secondary/50 border border-border rounded-lg p-3 mb-5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("What you get")}</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs"><CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" /> {t("Instant license key delivery")}</div>
                  <div className="flex items-center gap-2 text-xs"><CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" /> {isSubscription ? t("Auto-renewal & priority support") : t("Full duration access")}</div>
                  <div className="flex items-center gap-2 text-xs"><CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" /> {t("Discord VIP access")}</div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1 text-[10px] text-muted-foreground"><CreditCard className="w-3 h-3 text-primary" /> {t("Credit / Debit")}</div>
                <div className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1 text-[10px] text-muted-foreground"><Lock className="w-3 h-3 text-primary" /> PayPal</div>
              </div>

              {paypalFee > 0 && (
                <div className="mb-4 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-xs" data-no-translate>
                  <div className="flex justify-between text-muted-foreground"><span>{tier.name}</span><span>${displayPrice.toFixed(2)}</span></div>
                  <div className="mt-1 flex justify-between text-muted-foreground"><span>{t("PayPal fee")}</span><span>${paypalFee.toFixed(2)}</span></div>
                  <div className="mt-1.5 flex justify-between border-t border-border pt-1.5 text-sm font-bold text-foreground"><span>{t("Total")}</span><span>${chargePrice.toFixed(2)}</span></div>
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4 text-sm text-destructive text-center">{error}</div>
              )}

              {processing || loadingPlan ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-sm font-medium">{processing ? t("Processing your payment...") : t("Loading payment options...")}</span>
                </div>
              ) : (
                <PayPalScriptProvider
                  key={`${paymentType}-${tier.id}-${chargePrice}`}
                  options={{
                    clientId: paypalClientId,
                    currency: "USD",
                    intent: isSubscription ? "subscription" : "capture",
                    vault: isSubscription ? true : undefined,
                    components: "buttons",
                    "enable-funding": "card",
                    "disable-funding": "paylater",
                  }}
                >
                  {isSubscription ? (
                    <PayPalButtons
                      style={{ layout: "vertical", shape: "rect", label: "subscribe", color: "gold", height: 45 }}
                      createSubscription={createSubscriptionHandler}
                      onApprove={captureHandler}
                      onError={() => setError(t("Payment failed. Please try again."))}
                      onCancel={() => setError(null)}
                    />
                  ) : (
                    <>
                      <PayPalButtons
                        fundingSource={FUNDING.PAYPAL}
                        style={{ layout: "vertical", shape: "rect", label: "pay", color: "gold", height: 45 }}
                        createOrder={createOrderHandler}
                        onApprove={captureHandler}
                        onError={() => setError(t("Payment failed. Please try again."))}
                        onCancel={() => setError(null)}
                      />
                      <PayPalButtons
                        fundingSource={FUNDING.CARD}
                        style={{ layout: "vertical", shape: "rect", height: 45 }}
                        createOrder={createOrderHandler}
                        onApprove={captureHandler}
                        onError={() => setError(t("Payment failed. Please try again."))}
                        onCancel={() => setError(null)}
                      />
                    </>
                  )}
                </PayPalScriptProvider>
              )}

              <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
                <p className="font-medium text-foreground mb-1">{t("Card declined or blocked?")}</p>
                <p>{t("Some banks or countries block this type of payment. Try paying with your PayPal balance, use a different card, or connect through a VPN. Still stuck? We'll get you sorted on Discord.")}</p>
                <a
                  href="https://discord.com/invite/ufrz9Zaqs8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block font-medium text-primary hover:underline"
                >
                  {t("Get help on Discord")} →
                </a>
              </div>

              <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-muted-foreground">
                <Lock className="w-3 h-3" /> {t("Secure payment powered by PayPal")}
              </div>
              </>)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
