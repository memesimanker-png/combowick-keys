import { useState, useEffect } from "react";
import { PayPalScriptProvider, PayPalButtons, FUNDING } from "@paypal/react-paypal-js";
import { X, Loader2, CheckCircle, Zap, Lock, CreditCard, Clock, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";

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
  };
  paypalClientId: string;
}

export function PayPalCheckoutModal({ isOpen, onClose, tier, paypalClientId }: PayPalCheckoutModalProps) {
  const { t } = useTranslation();
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
  const displayPrice = isSubscription ? (tier.subscriptionPrice || tier.price) : tier.price;

  const createOrderHandler = async () => {
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("paypal-create-order", {
        body: { amount: displayPrice, tier: tier.id, description: `${tier.name} Premium Key` },
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
              amount: displayPrice,
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
              <div className="text-center mb-6">
                <h2 className="font-heading text-xl font-bold">{tier.name}</h2>
                <div className="mt-2 inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1" data-no-translate>
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-primary font-bold text-lg">${displayPrice}</span>
                  <span className="text-muted-foreground text-sm">{isSubscription ? t("/month") : t(" one-time")}</span>
                </div>
              </div>

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
                  key={`${paymentType}-${tier.id}-${displayPrice}`}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
