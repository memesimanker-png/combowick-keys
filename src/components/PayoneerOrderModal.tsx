import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";
import { DiscordSignInButton } from "@/components/DiscordSignInButton";

// "Pay with Payoneer": Payoneer needs $20+, so only Lifetime and the 90-day pack. The buyer signs in with Discord,
// the payoneer-order edge fn saves the order and the bot opens their private ticket, where staff send the
// Payoneer payment request. Once it's paid, staff press Approve and the key goes to the buyer's DMs.
export const PAYONEER_PLANS = [
  { id: "90d", name: "90 Days Key", price: 20, note: "3 months, every game" },
  { id: "lifetime", name: "Lifetime Key", price: 49.99, note: "Forever, every game" },
] as const;

const ERRORS: Record<string, string> = {
  sign_in: "Please sign in with Discord first.",
  discord_required: "Please sign in with Discord (not Google) so we can open your ticket.",
  bad_email: "Please enter a valid email. The Payoneer payment request is sent there.",
  bad_roblox: "That Roblox username doesn't look right.",
  not_in_server: "Join our Discord server first, then try again.",
};

export function PayoneerOrderModal({ isOpen, onClose, initialPlan = "90d" }: { isOpen: boolean; onClose: () => void; initialPlan?: string }) {
  const { t } = useTranslation();
  const [plan, setPlan] = useState(initialPlan);
  const [email, setEmail] = useState("");
  const [roblox, setRoblox] = useState("");
  const [isDiscord, setIsDiscord] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState("");

  useEffect(() => { if (isOpen) { setPlan(initialPlan); setError(""); setTicket(""); } }, [isOpen, initialPlan]);
  useEffect(() => {
    if (!isOpen) return;
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setIsDiscord(!!u?.identities?.some((x) => x.provider === "discord"));
      if (u?.email && !email) setEmail(u.email);
    });
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setBusy(true); setError("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("payoneer-order", { body: { plan, email, roblox } });
      if (fnErr) throw fnErr;
      if (data?.ticket) { setTicket(data.ticket); return; }
      if (data?.error === "not_in_server" && data?.invite) window.open(data.invite, "_blank");
      setError(t(ERRORS[data?.error] || "Something went wrong. Please try again or open a ticket on Discord."));
    } catch {
      setError(t("Something went wrong. Please try again or open a ticket on Discord."));
    } finally {
      setBusy(false);
    }
  };

  const chosen = PAYONEER_PLANS.find((p) => p.id === plan) ?? PAYONEER_PLANS[0];

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Pay with Payoneer")}</DialogTitle>
          <DialogDescription>{t("No PayPal? Pay with Payoneer. We open a private Discord ticket for you, send a Payoneer payment request to your email, and your key is sent to your Discord DMs as soon as it's paid.")}</DialogDescription>
        </DialogHeader>

        {ticket ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15"><Check className="h-6 w-6 text-green-400" /></div>
            <p className="text-sm">{t("Your order is in! Open your ticket on Discord — staff will send the Payoneer payment request there and to your email.")}</p>
            <a href={ticket} target="_blank" rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4752C4]">
              <ExternalLink className="h-4 w-4" /> {t("Open my ticket")}
            </a>
          </div>
        ) : isDiscord === false ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("Sign in with Discord so we can open your order ticket and DM you the key.")}</p>
            <DiscordSignInButton label={t("Sign in with Discord")} redirectPath="/premium-keys" />
          </div>
        ) : isDiscord === null ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {PAYONEER_PLANS.map((p) => (
                <button key={p.id} type="button" onClick={() => setPlan(p.id)}
                  className={`rounded-lg border p-3 text-left transition-colors ${plan === p.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                  <div className="text-sm font-semibold">{t(p.name)}</div>
                  <div className="text-2xl font-bold">${p.price}</div>
                  <div className="text-xs text-muted-foreground">{t(p.note)}</div>
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="po-email">{t("Email for the Payoneer payment request")}</Label>
              <Input id="po-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="po-roblox">{t("Roblox username (optional)")}</Label>
              <Input id="po-roblox" value={roblox} onChange={(e) => setRoblox(e.target.value)} placeholder="Roblox username" />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button onClick={submit} disabled={busy || !email} className="w-full py-5 font-bold">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `${t("Order")} ${t(chosen.name)} · $${chosen.price}`}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">{t("Payoneer has a $20 minimum, so it's only for the 90-day pack and Lifetime.")}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
