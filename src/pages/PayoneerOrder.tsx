import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, ExternalLink, ImageUp, Loader2, Clock, XCircle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";
import { VerifyCard, VerifyHeader } from "@/components/VerifyShell";
import { DiscordSignInButton } from "@/components/DiscordSignInButton";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";

// Payoneer order page (2026-10-29). The bot posts a stock Payoneer link in the buyer's Discord ticket (Payoneer
// doesn't allow payment links on a website), the buyer pays it, then uploads the payment screenshot HERE. The bot
// posts it in the ticket with Approve / Deny, and once staff approve, the key shows on this page (and DM + email).
type Order = {
  id: number; plan: "60d" | "lifetime"; price: number; status: string; created_at: string;
  ticket: string | null; link_ready: boolean; proof_at: string | null; key: string | null;
};

const PLAN_NAME: Record<string, string> = { "60d": "60 Days Key", lifetime: "Lifetime Key" };
const UPLOAD_ERRORS: Record<string, string> = {
  bad_image: "Please pick a PNG or JPG screenshot.",
  too_big: "That image is too big. Try a smaller screenshot.",
  too_many: "You already sent 5 screenshots. Staff will check them, or write in your ticket.",
  no_order: "This order is already closed.",
};

// shrink big phone screenshots before sending (max 1600px, JPEG)
async function toDataUrl(file: File): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const el = new Image();
    el.onload = () => res(el);
    el.onerror = rej;
    el.src = URL.createObjectURL(file);
  });
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  return c.toDataURL("image/jpeg", 0.85);
}

function Step({ n, state, title, children }: { n: number; state: "done" | "now" | "todo"; title: string; children?: ReactNode }) {
  const dot = state === "done" ? "bg-green-500/20 text-green-300 border-green-500/40" : state === "now" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border";
  return (
    <li className={`rounded-xl border p-4 ${state === "now" ? "border-primary/50 bg-primary/5" : "border-border bg-secondary/30"}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${dot}`}>
          {state === "done" ? <Check className="h-4 w-4" /> : n}
        </span>
        <span className={`text-sm font-semibold ${state === "todo" ? "text-muted-foreground" : ""}`}>{title}</span>
      </div>
      {children && <div className="mt-3 pl-10">{children}</div>}
    </li>
  );
}

export default function PayoneerOrder() {
  const { t } = useTranslation();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.functions.invoke("payoneer-order", { body: { action: "status" } });
    if (data?.error === "sign_in" || data?.error === "discord_required") { setSignedIn(false); return; }
    setOrder(data?.order ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const ok = !!data.session?.user?.identities?.some((x) => x.provider === "discord");
      setSignedIn(ok);
      if (ok) load();
    });
  }, [load]);

  // while staff are checking, look for the key every 20 seconds
  useEffect(() => {
    if (!order || order.status === "approved" || order.status === "denied") return;
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [order, load]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setErr(""); setMsg("");
    try {
      if (!/^image\//.test(file.type)) throw new Error("bad_image");
      const image = await toDataUrl(file);
      const { data, error } = await supabase.functions.invoke("payoneer-order", { body: { action: "proof", image } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMsg(t("Screenshot sent! Staff are checking your payment now."));
      await load();
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setErr(t(UPLOAD_ERRORS[code] || "Upload failed. Please try again, or send the screenshot in your Discord ticket."));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const copyKey = async () => {
    if (!order?.key) return;
    try { await navigator.clipboard.writeText(order.key); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  const o = order;
  const done = o?.status === "approved";
  const sent = !!o?.proof_at;
  const percent = !o ? 0 : done ? 100 : sent ? 75 : o.link_ready ? 50 : 25;

  return (
    <Layout>
      <SEOHead title="Your Payoneer Order — Combo_WICK" description="Track your Payoneer order, upload your payment screenshot and get your premium key." />
      <section className="px-4 py-10 sm:py-14">
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
                  <div className="flex items-center justify-center gap-2">
                    <code data-no-translate className="break-all rounded-lg bg-background px-3 py-2 font-mono text-sm sm:text-base">{o.key}</code>
                    <button onClick={copyKey} className="shrink-0 rounded-lg border border-border p-2 hover:bg-secondary" aria-label={t("Copy")}>
                      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground">{t("Run the script in any supported game and paste the key in the Premium Key tab. We also sent it to your Discord DMs and your email.")}</p>
              </div>
            ) : o.status === "denied" ? (
              <div className="space-y-3 py-4 text-center">
                <XCircle className="mx-auto h-8 w-8 text-destructive" />
                <p className="text-sm">{t("This order was cancelled. If you think this is a mistake, write in your Discord ticket.")}</p>
                {o.ticket && <a href={o.ticket} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold text-primary underline">{t("Open my ticket")}</a>}
              </div>
            ) : (
              <ol className="space-y-3">
                <Step n={1} state="done" title={t("Order placed")} />
                <Step n={2} state={sent ? "done" : "now"} title={t("Pay the Payoneer link in your Discord ticket")}>
                  {!sent && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {o.link_ready ? t("Your payment link is waiting in your ticket and your Discord DMs.") : t("Your payment link is on its way to your ticket.")}
                        {o.plan === "lifetime" && <> {t("Type exactly this amount on the Payoneer page:")} <b data-no-translate className="text-foreground">{o.price.toFixed(2)} USD</b></>}
                      </p>
                      {o.ticket && (
                        <a href={o.ticket} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4752C4]">
                          <ExternalLink className="h-4 w-4" /> {t("Open my ticket")}
                        </a>
                      )}
                    </div>
                  )}
                </Step>
                <Step n={3} state={sent ? "done" : "now"} title={t("Upload a screenshot of your payment")}>
                  <div className="space-y-2">
                    {o.status === "expired" && !sent && <p className="text-xs text-amber-300">{t("This order expired. Only upload a screenshot if you already paid.")}</p>}
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
                    <button onClick={() => fileRef.current?.click()} disabled={busy}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 ${sent ? "border border-border hover:bg-secondary" : "bg-primary text-primary-foreground"}`}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
                      {sent ? t("Send another screenshot") : t("Upload screenshot")}
                    </button>
                    <p className="text-[11px] text-muted-foreground">{t("The screenshot must show the amount and that the payment went through.")}</p>
                    {msg && <p className="text-xs text-green-400">{msg}</p>}
                    {err && <p className="text-xs text-destructive">{err}</p>}
                  </div>
                </Step>
                <Step n={4} state={sent ? "now" : "todo"} title={t("Get your key")}>
                  {sent && (
                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {t("Staff are checking your payment. Your key will show up right here, in your Discord DMs and in your email. You can leave this page.")}
                    </p>
                  )}
                </Step>
              </ol>
            )}
          </div>
        </VerifyCard>
      </section>
    </Layout>
  );
}
