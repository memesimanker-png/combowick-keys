import { useState, useEffect } from "react";
import { PayPalScriptProvider, PayPalButtons, FUNDING } from "@paypal/react-paypal-js";
import { X, Loader2, CheckCircle, Crown, Lock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";

const OWNER_PRICE = 1000;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  paypalClientId: string;
}

/**
 * High-ticket ($1000) Owner/Admin checkout. Collects the buyer's Discord
 * username BEFORE payment, requires a no-refund acknowledgement, captures via
 * PayPal (server-side, no key issued), then pings the owner's Discord webhook
 * (server-side, via `notify-owner-purchase`) with the username.
 */
export function OwnerCheckoutModal({ isOpen, onClose, paypalClientId }: Props) {
  const { t } = useTranslation();
  const [discord, setDiscord] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) { setError(null); setProcessing(false); setSuccess(false); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !processing && !success) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [isOpen, processing, success, onClose]);

  if (!isOpen) return null;

  const ready = discord.trim().length >= 2 && agreed;

  const createOrderHandler = async () => {
    setError(null);
    if (!ready) { setError(t("Please enter your Discord username.")); throw new Error("not ready"); }
    const { data, error: fnError } = await supabase.functions.invoke("paypal-create-order", {
      body: { amount: OWNER_PRICE, tier: "owner", description: `ComboWick Owner/Admin (5mo) — Discord: ${discord.trim()}` },
    });
    if (fnError || !data?.order_id) { setError(t("Payment failed. Please try again.")); throw new Error("create failed"); }
    return data.order_id;
  };

  const captureHandler = async (data: any) => {
    setProcessing(true);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("paypal-capture-donation", {
        body: { order_id: data.orderID, amount: OWNER_PRICE },
      });
      if (fnError || result?.status !== "COMPLETED") throw new Error("capture failed");

      // Fire the Discord @everyone ping server-side (webhook stays a server secret).
      // Best-effort: the purchase already succeeded even if the ping can't send.
      try {
        await supabase.functions.invoke("notify-owner-purchase", {
          body: { order_id: data.orderID, discord_username: discord.trim() },
        });
      } catch { /* ping is non-blocking */ }

      setSuccess(true);
    } catch {
      setError(t("Payment capture failed"));
    } finally {
      setProcessing(false);
    }
  };

  const guardedClose = () => { if (!processing && !success) onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={guardedClose} />
      <div className="relative z-10 w-full max-w-md overflow-y-auto rounded-2xl border border-yellow-500/40 bg-card shadow-2xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="h-1.5 bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-500/40" />
        <div className="p-6">
          <button onClick={success ? onClose : guardedClose} disabled={processing} className="absolute right-5 top-5 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30" aria-label={t("Close")}>
            <X className="h-4 w-4" />
          </button>

          {success ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/20">
                <CheckCircle className="h-8 w-8 text-yellow-400" />
              </div>
              <h2 className="mb-2 font-heading text-xl font-bold">{t("Payment received!")}</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                {t("Your Owner/Admin role will be set up on Discord shortly. Keep an eye on your DMs.")}
              </p>
              <button onClick={onClose} className="w-full rounded-lg bg-yellow-500 py-3 font-bold text-black transition-colors hover:bg-yellow-400">
                {t("Done")}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/15">
                  <Crown className="h-6 w-6 text-yellow-400" />
                </div>
                <h2 className="font-heading text-xl font-bold text-yellow-300">{t("Owner / Admin Access")}</h2>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1" data-no-translate>
                  <span className="text-lg font-bold text-yellow-300">${OWNER_PRICE.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">· {t("5 months • one-time")}</span>
                </div>
              </div>

              {/* Discord username (required, collected before payment) */}
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{t("Your Discord username")}</label>
              <input
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                placeholder={t("Enter your Discord username")}
                className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-yellow-500/60"
              />

              {/* No-refund acknowledgement (required) */}
              <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-yellow-300">
                  <AlertTriangle className="h-3.5 w-3.5" /> {t("All sales are final — NO REFUNDS")}
                </div>
                <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-yellow-500" />
                  <span>{t("I understand this purchase is non-refundable.")}</span>
                </label>
              </div>

              {error && <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">{error}</div>}

              {processing ? (
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
                  <span className="text-sm font-medium">{t("Processing your payment...")}</span>
                </div>
              ) : (
                <div className={ready ? "" : "pointer-events-none opacity-50"}>
                  <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "USD", intent: "capture", components: "buttons", "enable-funding": "card", "disable-funding": "paylater" }}>
                    <PayPalButtons fundingSource={FUNDING.PAYPAL} style={{ layout: "vertical", shape: "rect", label: "pay", color: "gold", height: 45 }} createOrder={createOrderHandler} onApprove={captureHandler} onError={() => setError(t("Payment failed. Please try again."))} onCancel={() => setError(null)} />
                    <PayPalButtons fundingSource={FUNDING.CARD} style={{ layout: "vertical", shape: "rect", height: 45 }} createOrder={createOrderHandler} onApprove={captureHandler} onError={() => setError(t("Payment failed. Please try again."))} onCancel={() => setError(null)} />
                  </PayPalScriptProvider>
                </div>
              )}

              <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                <Lock className="h-3 w-3" /> {t("Secure payment powered by PayPal")}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
