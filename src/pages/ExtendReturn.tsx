import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Shield, CheckCircle, Loader2, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { NoIndex } from "@/components/NoIndex";
import { supabase } from "@/integrations/supabase/client";
import { buildLinkvertiseUrl } from "@/lib/linkvertise";
import { useVerifyLinks } from "@/hooks/useVerifyLinks";
import { extSid, reportStep } from "@/lib/verify-session";
import { useTranslation } from "@/lib/translation-context";

type Step = "step1" | "step2" | "step3";

const APPROVED_DOMAINS = [
  "linkvertise.com", "link-to.net", "link-target.net",
  "link-center.net", "link-hub.net", "direct-link.net",
];
const BLOCKED_DOMAINS = ["thebypasser.com", "bypass.city", "linkvertise.net", "adbypass.org"];

function extractDomain(url: string): string {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h.startsWith("www.") ? h.slice(4) : h;
  } catch { return ""; }
}
const isApproved = (d: string) => APPROVED_DOMAINS.some((a) => d === a || d.endsWith(`.${a}`));
const isBlocked = (d: string) => BLOCKED_DOMAINS.some((b) => d === b || d.endsWith(`.${b}`));

function isStep(v: string | undefined): v is Step {
  return v === "step1" || v === "step2" || v === "step3";
}

interface Pending { token: string; hwid: string; key: string; step: number; ts: number; }

export default function ExtendReturn() {
  const navigate = useNavigate();
  const { step: routeStep } = useParams<{ step?: string }>();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();
  const links = useVerifyLinks();
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState(() => t("Validating completion…"));
  const [result, setResult] = useState<{ before?: number | null; after?: number | null; hours?: number } | null>(null);
  const [ranWithLinks, setRanWithLinks] = useState(false);
  const [linksTimedOut, setLinksTimedOut] = useState(false);
  useEffect(() => { const id = setTimeout(() => setLinksTimedOut(true), 2500); return () => clearTimeout(id); }, []);

  useEffect(() => {
    // Wait until admin links have loaded (needed to build next hop), or give up waiting after 2.5 s.
    if ((links.every((l) => l === null) && !linksTimedOut) || ranWithLinks) return;
    setRanWithLinks(true);
    void (async () => {

    const step = routeStep;
    const hash = params.get("hash");

    if (!isStep(step)) {
      navigate("/blocked?reason=step_sequence&redirect=/extend-key", { replace: true });
      return;
    }

    let pending: Pending | null = null;
    try {
      const raw = localStorage.getItem("ext_pending");
      pending = raw ? JSON.parse(raw) : null;
    } catch { /* noop */ }

    if (!pending || !pending.token) {
      navigate("/blocked?reason=suspicious_activity&redirect=/extend-key", { replace: true });
      return;
    }

    const expectedStep = pending.step; // 1,2,3
    const stepNum = Number(step.replace("step", ""));
    if (stepNum !== expectedStep) {
      navigate("/blocked?reason=step_sequence&redirect=/extend-key", { replace: true });
      return;
    }

    // 2026-11-19: report the step to the server FIRST (Linkvertise's hash lives ~10 s). complete-key-extension only
    // adds hours for a complete server-side chain; before this, a script could add hours to any key in seconds.
    const sid = extSid();
    const rep = sid && hash ? await reportStep({ action: "step", sid, step, hash }) : { ok: false, reason: "no_session" };
    const serverOk = rep.ok || rep.reason === "repeat";
    if (!serverOk && rep.reason !== "network") {
      localStorage.removeItem("ext_pending");
      toast({ variant: "destructive", title: t("Step not counted"), description: t("Start again from the Add Hours page.") });
      setMsg(t("That step didn't count. Start again from the Add Hours page."));
      setTimeout(() => navigate("/extend-key", { replace: true }), 2500);
      return;
    }
    // Server unreachable: fall back to the old browser check (referrer must be a real Linkvertise domain + hash).
    if (!serverOk) {
      const refDomain = extractDomain(document.referrer);
      if (isBlocked(refDomain) || !hash || !isApproved(refDomain)) {
        navigate("/blocked?reason=suspicious_activity&redirect=/extend-key", { replace: true });
        return;
      }
    }

    // Advance to the next hop, or finalize on step 3.
    if (stepNum < 3) {
      const nextStep = stepNum + 1;
      pending.step = nextStep;
      localStorage.setItem("ext_pending", JSON.stringify(pending));
      setDone(true);
      setMsg(t("Step {n} of 3 complete. Continuing…").replace("{n}", String(stepNum)));
      toast({ title: t("Step Complete"), description: t("Step {n} of 3 done.").replace("{n}", String(stepNum)) });
      const returnUrl = `${window.location.origin}/ad-return/ext/step${nextStep}`;
      setTimeout(() => { window.location.href = buildLinkvertiseUrl(links[nextStep - 1], returnUrl); }, 800);
      return;
    }

    // Step 3 — verify + apply the extension server-side.
    await (async () => {
      setMsg(t("All steps complete. Adding your hours…"));
      try {
        const { data, error } = await supabase.functions.invoke("complete-key-extension", {
          body: { token: pending!.token, hwid: pending!.hwid, sid },
        });
        let serverErr = "";
        if (error) {
          try { const ctx = (error as any)?.context; if (ctx?.json) { const j = await ctx.json(); serverErr = j?.error || ""; } } catch { /* noop */ }
        }
        if (!serverErr && data?.success === false) serverErr = data.error || "";

        localStorage.removeItem("ext_pending");

        if (error || data?.success === false) {
          toast({ variant: "destructive", title: t("Extension failed"), description: t(serverErr || "Try again.") });
          setMsg(t(serverErr || "Extension failed."));
          setTimeout(() => navigate("/extend-key", { replace: true }), 2500);
          return;
        }

        setDone(true);
        setResult({ before: data.before_hours_left, after: data.after_hours_left, hours: data.hours });
        setMsg(t("Success! +{n}h added to your key.").replace("{n}", String(data.hours)));
        toast({ title: t("Hours Added!"), description: t("+{n}h stacked onto your key.").replace("{n}", String(data.hours)) });
      } catch {
        localStorage.removeItem("ext_pending");
        toast({ variant: "destructive", title: t("Network error"), description: t("Please try again.") });
        setTimeout(() => navigate("/extend-key", { replace: true }), 2500);
      }
    })();
    })();
  }, [links, linksTimedOut, ranWithLinks, routeStep, params, navigate, toast]);

  return (
    <div className="min-h-screen bg-black/70 flex flex-col">
      <NoIndex />
      <header className="container py-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">{t("ComboWick Verify")}</h1>
        </div>
      </header>
      <main className="flex-1 container flex flex-col items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("Key Extension")}</CardTitle>
            <CardDescription>{t("Finalizing your added hours…")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              {done ? <CheckCircle className="h-16 w-16 text-green-500" /> : <Loader2 className="h-12 w-12 text-primary animate-spin" />}
              <p className="mt-4 text-center text-muted-foreground">{msg}</p>
              {result && (
                <div className="mt-6 w-full rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-primary"><Clock className="h-4 w-4" /> {t("Time stacked")}</div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("Before")}</span><span>{result.before != null ? t("{n}h left").replace("{n}", String(result.before)) : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("Added")}</span><span dir="ltr">+{result.hours}h</span></div>
                  <div className="flex justify-between font-semibold"><span>{t("After")}</span><span>{result.after != null ? t("{n}h left").replace("{n}", String(result.after)) : "—"}</span></div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
