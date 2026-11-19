import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/translation-context";

const PACKS = [
  { id: "7d", label: "+7 Days", price: 3, hint: "$0.43 / day" },
  { id: "30d", label: "+30 Days", price: 8, hint: "$0.27 / day" },
] as const;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  paypalClientId: string;
  keyValue: string;
  onSuccess: () => void;
};

export function TopUpModal({ isOpen, onClose, paypalClientId, keyValue, onSuccess }: Props) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [pack, setPack] = useState<(typeof PACKS)[number]["id"]>("30d");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState<null | string>(null);

  const selected = PACKS.find((p) => p.id === pack)!;

  const createOrder = async () => {
    const { data, error } = await supabase.functions.invoke("paypal-create-order", {
      body: { amount: selected.price, description: `ComboWick Key Top-Up ${selected.label}`, tier: `topup-${pack}` },
    });
    if (error || !data?.order_id) throw new Error("Failed to create order");
    return data.order_id as string;
  };

  const onApprove = async (data: { orderID: string }) => {
    setProcessing(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("shop-key-topup-capture", {
        body: { order_id: data.orderID, key: keyValue, pack },
      });
      if (error || res?.error) {
        toast({ variant: "destructive", title: t("Top-up failed"), description: t(res?.error || error?.message || "Please try again.") });
        return;
      }
      if (res?.status === "PENDING") {
        toast({ title: t("Payment clearing"), description: t("Your hours will be added once the payment completes.") });
        onClose();
        return;
      }
      setDone(res?.new_expires_at || "");
      toast({ title: t("Hours added!"), description: t("{n} added to your key.").replace("{n}", t(selected.label)) });
      onSuccess();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> {t("Add More Hours")}</DialogTitle>
        </DialogHeader>

        {done !== null ? (
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-success/15 flex items-center justify-center">
              <Check className="h-6 w-6 text-success" />
            </div>
            <p className="font-semibold">{t("Time added to your key")}</p>
            {done && <p className="text-sm text-muted-foreground">{t("New expiry:")} {new Date(done).toLocaleString()}</p>}
            <Button onClick={onClose} className="w-full mt-2">{t("Done")}</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground break-all">
              {t("Extending key:")} <span className="font-mono text-foreground">{keyValue}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {PACKS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPack(p.id)}
                  className={`rounded-lg border p-4 text-start transition ${pack === p.id ? "border-primary bg-primary/10" : "border-border bg-secondary/30 hover:border-primary/40"}`}
                >
                  <div className="font-bold text-lg">{t(p.label)}</div>
                  <div className="text-2xl font-bold">${p.price}</div>
                  <div className="text-xs text-muted-foreground">{t(p.hint)}</div>
                </button>
              ))}
            </div>

            {processing ? (
              <div className="flex items-center justify-center py-4 gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("Adding hours…")}
              </div>
            ) : (
              <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "USD", components: "buttons" }}>
                <PayPalButtons
                  style={{ layout: "vertical", color: "gold", shape: "rect" }}
                  forceReRender={[pack]}
                  createOrder={createOrder}
                  onApprove={onApprove}
                  onError={() => toast({ variant: "destructive", title: t("PayPal error"), description: t("Please try again.") })}
                />
              </PayPalScriptProvider>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
