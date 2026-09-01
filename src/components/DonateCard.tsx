import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, X, Loader2, CheckCircle, Lock } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons, FUNDING } from "@paypal/react-paypal-js";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";

const PRESET_AMOUNTS = [3, 5, 10, 25];

export function DonateCard({ paypalClientId }: { paypalClientId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(5);
  const [custom, setCustom] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const effectiveAmount = custom.trim() ? Math.max(1, Number(custom) || 0) : amount;

  const createOrderHandler = async () => {
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke("paypal-create-order", {
      body: { amount: effectiveAmount, tier: "donation", description: "ComboWick Donation 💛" },
    });
    if (fnError || !data?.order_id) {
      setError(t("Failed to start donation. Please try again."));
      throw new Error("create order failed");
    }
    return data.order_id;
  };

  const captureHandler = async (data: any) => {
    setProcessing(true);
    try {
      const { error: fnError } = await supabase.functions.invoke("paypal-capture-donation", {
        body: { order_id: data.orderID, amount: effectiveAmount },
      });
      if (fnError) throw new Error("capture failed");
      setSuccess(true);
    } catch {
      setError(t("Donation could not be confirmed. Please try again."));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Card className="p-8 text-center card-neon border-pink-500/30 bg-pink-500/5">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/15 mb-4">
          <Heart className="h-7 w-7 text-pink-400" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-2">{t("Support ComboWick")}</h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-6">
          {t("Love the free scripts? A small donation keeps our servers running and new scripts coming. Every bit helps!")}
        </p>
        <Button
          onClick={() => { setOpen(true); setSuccess(false); setError(null); }}
          className="px-8 py-5 font-bold bg-pink-600 hover:bg-pink-700 text-white"
        >
          <Heart className="h-4 w-4 mr-2" /> {t("Donate")}
        </Button>
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { if (!processing) setOpen(false); }}
          />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="h-1.5 bg-gradient-to-r from-pink-500 via-accent to-pink-500/40" />
            <div className="p-6">
              <button
                onClick={() => { if (!processing) setOpen(false); }}
                className="absolute top-5 right-5 text-muted-foreground hover:text-foreground rounded-full p-1.5 hover:bg-secondary"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {success ? (
                <div className="text-center py-6">
                  <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                  <h2 className="font-heading text-xl font-bold mb-2">{t("Thank You! 💛")}</h2>
                  <p className="text-sm text-muted-foreground mb-6">{t("Your support means the world to us.")}</p>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-full py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm"
                  >
                    {t("Done")}
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <h2 className="font-heading text-xl font-bold">{t("Donate to ComboWick")}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{t("Choose an amount")}</p>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4" data-no-translate>
                    {PRESET_AMOUNTS.map((a) => (
                      <button
                        key={a}
                        onClick={() => { setAmount(a); setCustom(""); }}
                        className={`py-2.5 rounded-lg border text-sm font-bold transition-all ${
                          !custom && amount === a
                            ? "border-pink-500 bg-pink-500/15 text-pink-300"
                            : "border-border bg-secondary/40 hover:bg-secondary"
                        }`}
                      >
                        ${a}
                      </button>
                    ))}
                  </div>

                  <div className="mb-5">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("Custom amount (USD)")}</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={custom}
                      onChange={(e) => setCustom(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                    />
                  </div>

                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4 text-sm text-destructive text-center">{error}</div>
                  )}

                  {processing ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin text-pink-400" />
                      <span className="text-sm font-medium">{t("Processing your donation...")}</span>
                    </div>
                  ) : paypalClientId ? (
                    <PayPalScriptProvider
                      key={`donate-${effectiveAmount}`}
                      options={{
                        clientId: paypalClientId,
                        currency: "USD",
                        intent: "capture",
                        components: "buttons",
                        "enable-funding": "card",
                        "disable-funding": "paylater",
                      }}
                    >
                      <PayPalButtons
                        fundingSource={FUNDING.PAYPAL}
                        style={{ layout: "vertical", shape: "rect", label: "donate", color: "gold", height: 45 }}
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
                    </PayPalScriptProvider>
                  ) : (
                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-muted-foreground">
                    <Lock className="w-3 h-3" /> {t("Secure payment powered by PayPal")}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
