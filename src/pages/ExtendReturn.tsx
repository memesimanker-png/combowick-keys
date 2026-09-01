import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Shield, CheckCircle, Loader2, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { NoIndex } from "@/components/NoIndex";
import { supabase } from "@/integrations/supabase/client";
import { buildLinkvertiseUrl } from "@/lib/linkvertise";
import { useVerifyLinks } from "@/hooks/useVerifyLinks";

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
  const links = useVerifyLinks();
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("Validating completion…");
  const [result, setResult] = useState<{ before?: number | null; after?: number | null; hours?: number } | null>(null);
  const [ranWithLinks, setRanWithLinks] = useState(false);

  useEffect(() => {
    // Wait until admin links have loaded (needed to build next hop).
    if (links.every((l) => l === null) || ranWithLinks) return;
    setRanWithLinks(true);

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

    // Anti-bypass: referrer must come from a real Linkvertise domain + hash present.
    const refDomain = extractDomain(document.referrer);
    if (isBlocked(refDomain)) {
      navigate("/blocked?reason=suspicious_activity&redirect=/extend-key", { replace: true });
      return;
    }
    if (!hash || !isApproved(refDomain)) {
      navigate("/blocked?reason=suspicious_activity&redirect=/extend-key", { replace: true });
      return;
    }

    // Advance to the next hop, or finalize on step 3.
    if (stepNum < 3) {
      const nextStep = stepNum + 1;
      pending.step = nextStep;
      localStorage.setItem("ext_pending", JSON.stringify(pending));
      setDone(true);
      setMsg(`Step ${stepNum} of 3 complete. Continuing…`);
      toast({ title: "Step Complete", description: `Step ${stepNum} of 3 done.` });
      const returnUrl = `${window.location.origin}/ad-return/ext/step${nextStep}`;
      setTimeout(() => { window.location.href = buildLinkvertiseUrl(links[nextStep - 1], returnUrl); }, 800);
      return;
    }

    // Step 3 — verify + apply the extension server-side.
    (async () => {
      setMsg("All steps complete. Adding your hours…");
      try {
        const { data, error } = await supabase.functions.invoke("complete-key-extension", {
          body: { token: pending!.token, hwid: pending!.hwid },
        });
        let serverErr = "";
        if (error) {
          try { const ctx = (error as any)?.context; if (ctx?.json) { const j = await ctx.json(); serverErr = j?.error || ""; } } catch { /* noop */ }
        }
        if (!serverErr && data?.success === false) serverErr = data.error || "";

        localStorage.removeItem("ext_pending");

        if (error || data?.success === false) {
          toast({ variant: "destructive", title: "Extension failed", description: serverErr || "Try again." });
          setMsg(serverErr || "Extension failed.");
          setTimeout(() => navigate("/extend-key", { replace: true }), 2500);
          return;
        }

        setDone(true);
        setResult({ before: data.before_hours_left, after: data.after_hours_left, hours: data.hours });
        setMsg(`Success! +${data.hours}h added to your key.`);
        toast({ title: "Hours Added!", description: `+${data.hours}h stacked onto your key.` });
      } catch {
        localStorage.removeItem("ext_pending");
        toast({ variant: "destructive", title: "Network error", description: "Please try again." });
        setTimeout(() => navigate("/extend-key", { replace: true }), 2500);
      }
    })();
  }, [links, ranWithLinks, routeStep, params, navigate, toast]);

  return (
    <div className="min-h-screen bg-black/70 flex flex-col">
      <NoIndex />
      <header className="container py-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">ComboWick Verify</h1>
        </div>
      </header>
      <main className="flex-1 container flex flex-col items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Key Extension</CardTitle>
            <CardDescription>Finalizing your added hours…</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              {done ? <CheckCircle className="h-16 w-16 text-green-500" /> : <Loader2 className="h-12 w-12 text-primary animate-spin" />}
              <p className="mt-4 text-center text-muted-foreground">{msg}</p>
              {result && (
                <div className="mt-6 w-full rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-primary"><Clock className="h-4 w-4" /> Time stacked</div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Before</span><span>{result.before != null ? `${result.before}h left` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Added</span><span>+{result.hours}h</span></div>
                  <div className="flex justify-between font-semibold"><span>After</span><span>{result.after != null ? `${result.after}h left` : "—"}</span></div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
