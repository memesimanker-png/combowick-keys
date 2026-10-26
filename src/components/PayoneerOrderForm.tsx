import { useEffect, useState } from "react";
import { Loader2, ExternalLink, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";
import { DiscordSignInButton } from "@/components/DiscordSignInButton";

// Payoneer tab of the checkout modal. Payoneer needs $20+, so only Lifetime (at today's sale price) and the 60-day pack. The buyer signs in
// with Discord, the payoneer-order edge fn saves the order and the bot opens their private ticket, where staff send
// the Payoneer payment link. Once it's paid, staff press Approve and the key goes to the buyer's DMs.
export const PAYONEER_PLANS = {
  "60d": { name: "60 Days Key", price: 21.99 },
  lifetime: { name: "Lifetime Key", price: 49.99 },
} as const;
export type PayoneerPlan = keyof typeof PAYONEER_PLANS;

// remembers the order across the Discord sign-in redirect so /premium-keys can reopen it
export const PO_RETURN_KEY = "cw_po_plan";

const ERRORS: Record<string, string> = {
  sign_in: "Please sign in with Discord first.",
  discord_required: "Please sign in with Discord (not Google) so we can open your ticket.",
  bad_roblox: "That Roblox username doesn't look right.",
  not_in_server: "Join our Discord server first, then try again.",
};

export function PayoneerOrderForm({ plan, price }: { plan: PayoneerPlan; price: number }) {
  const { t } = useTranslation();
  const [roblox, setRoblox] = useState("");
  const [isDiscord, setIsDiscord] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsDiscord(!!data.session?.user?.identities?.some((x) => x.provider === "discord"));
    });
  }, []);

  const submit = async () => {
    setBusy(true); setError("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("payoneer-order", { body: { plan, roblox } });
      if (fnErr) throw fnErr;
      if (data?.ticket) {
        setTicket(data.ticket);
        try { sessionStorage.removeItem(PO_RETURN_KEY); } catch { /* ignore */ }
        return;
      }
      if (data?.error === "not_in_server" && data?.invite) window.open(data.invite, "_blank");
      setError(t(ERRORS[data?.error] || "Something went wrong. Please try again or open a ticket on Discord."));
    } catch {
      setError(t("Something went wrong. Please try again or open a ticket on Discord."));
    } finally {
      setBusy(false);
    }
  };

  const steps = [
    "Sign in with Discord and place your order.",
    "We send you a Payoneer payment link in your Discord ticket.",
    "Once it's paid, your key is sent to your Discord DMs.",
  ];

  if (ticket) {
    return (
      <div className="space-y-4 py-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15"><Check className="h-7 w-7 text-green-400" /></div>
        <p className="text-sm">{t("Your order is in! Open your ticket on Discord — staff will send your Payoneer payment link there.")}</p>
        <a href={ticket} target="_blank" rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4752C4]">
          <ExternalLink className="h-4 w-4" /> {t("Open my ticket")}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-2 rounded-lg border border-border bg-secondary/50 p-3">
        {steps.map((s, i) => (
          <li key={s} className="flex items-start gap-2.5 text-xs">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">{i + 1}</span>
            <span className="pt-0.5">{t(s)}</span>
          </li>
        ))}
      </ol>

      {isDiscord === null ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : !isDiscord ? (
        <div onClickCapture={() => { try { sessionStorage.setItem(PO_RETURN_KEY, plan); } catch { /* ignore */ } }}>
          <DiscordSignInButton label={t("Sign in with Discord")} redirectPath="/premium-keys" />
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <label htmlFor="po-roblox" className="text-xs font-medium">{t("Roblox username (optional)")}</label>
            <input id="po-roblox" value={roblox} onChange={(e) => setRoblox(e.target.value)} placeholder="Roblox username"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          {error && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">{error}</div>}
          <button onClick={submit} disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF4800] py-3 text-sm font-bold text-white transition-colors hover:bg-[#e04000] disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <span data-no-translate>{t("Order with Payoneer")} · ${price}</span>}
          </button>
        </>
      )}
    </div>
  );
}
