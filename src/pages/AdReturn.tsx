import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Shield, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { NoIndex } from "@/components/NoIndex";
import { supabase } from "@/integrations/supabase/client";
import { reportStep, verifySid } from "@/lib/verify-session";
import { useTranslation } from "@/lib/translation-context";

type VerificationStep = "step1" | "step2" | "step3";

const APPROVED_DOMAINS = [
  "linkvertise.com",
  "link-to.net",
  "link-target.net",
  "link-center.net",
  "link-hub.net",
  "direct-link.net",
];

const BLOCKED_DOMAINS = ["thebypasser.com", "bypass.city", "linkvertise.net", "adbypass.org"];

const NEXT_ROUTE: Record<VerificationStep, string> = {
  step1: "/verify/step2",
  step2: "/verify/step3",
  step3: "/access-key",
};

function isVerificationStep(value: string | null | undefined): value is VerificationStep {
  return value === "step1" || value === "step2" || value === "step3";
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  } catch {
    return "";
  }
}

function isApprovedDomain(domain: string): boolean {
  return APPROVED_DOMAINS.some((approvedDomain) => domain === approvedDomain || domain.endsWith(`.${approvedDomain}`));
}

function isBlockedDomain(domain: string): boolean {
  return BLOCKED_DOMAINS.some((blockedDomain) => domain === blockedDomain || domain.endsWith(`.${blockedDomain}`));
}

function getStepMessage(step: VerificationStep) {
  if (step === "step3") {
    return {
      title: "Verification Successful",
      description: "All verification steps have been completed successfully!",
      redirectText: "Redirecting to access key...",
    };
  }

  return {
    title: "Verification Successful",
    description: `Step ${step.replace("step", "")} has been completed successfully.`,
    redirectText: `Redirecting to step ${step === "step1" ? "2" : "3"}...`,
  };
}

export default function AdReturn() {
  const navigate = useNavigate();
  const { step: routeStep } = useParams<{ step?: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [completedStep, setCompletedStep] = useState<VerificationStep | null>(null);
  const [isFinalStep, setIsFinalStep] = useState(false);

  const queryStep = searchParams.get("step");
  const hash = searchParams.get("hash");

  useEffect(() => {
    let timeoutId: number | undefined;
    let cancelled = false;

    // Report the step to the server FIRST: Linkvertise keeps the ?hash= only 10 seconds, so it must be checked before
    // anything else loads (slow phones). The result is used further down, after the local checks.
    const ls = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
    const earlyStep = routeStep || queryStep || ls("verification_step");
    const earlyReport = hash && isVerificationStep(earlyStep) && (ls("selected_ad_provider") || "linkvertise") === "linkvertise"
      ? reportStep({ action: "step", sid: verifySid() || "", step: earlyStep, hash })
      : null;
    (async () => {
    // How many Linkvertise steps the admin configured (2 or 3). Determines the final step.
    let verifySteps = 3;
    try {
      const { data } = await supabase.from("verify_settings").select("verify_steps").eq("id", 1).maybeSingle();
      const v = (data as any)?.verify_steps;
      if (v === 2 || v === 3) verifySteps = v;
    } catch { /* default 3 */ }
    if (cancelled) return;
    const lastStep: VerificationStep = verifySteps === 2 ? "step2" : "step3";

    const currentStep = routeStep || queryStep || ls("verification_step");
    const selectedProvider = ls("selected_ad_provider") || "linkvertise";
    const pendingStep = ls("verification_step");
    const referrerDomain = extractDomain(document.referrer);

    if (!isVerificationStep(currentStep)) {
      navigate("/blocked?reason=step_sequence&redirect=/verify/provider-select", { replace: true });
      return;
    }

    // 2026-11-19: the SERVER's answer comes first. It already saved this step (in order, not too fast, Linkvertise
    // hash checked), so the browser-only checks below (step flags, referrer) must not overrule it. Before, a player
    // whose new tab had no referrer was sent to /blocked AFTER the server saved the step, and every retry of that
    // checkpoint then got "repeat" -> /blocked again: a loop with no way out. "repeat" = this step is already saved.
    const early = earlyReport ? await earlyReport : null;
    if (cancelled) return;
    const serverOk = !!early && (early.ok || early.reason === "repeat");
    if (early && !serverOk && early.reason !== "network") {
      // refused for real: out of order / reused -> fresh run at checkpoint 1 (new session id there); too fast -> redo this one
      navigate(`/blocked?reason=suspicious_activity&redirect=/verify/${early.reason === "out_of_order" || early.reason === "used" || early.reason === "bad_session" ? "step1" : currentStep}`, { replace: true });
      return;
    }
    if (!serverOk) {

    if (pendingStep && pendingStep !== currentStep) {
      navigate(`/blocked?reason=step_sequence&redirect=/verify/${pendingStep}`, { replace: true });
      return;
    }

    if (currentStep === "step2" && localStorage.getItem("step1_completed") !== "true") {
      navigate("/blocked?reason=step_sequence&redirect=/verify/step1", { replace: true });
      return;
    }

    if (currentStep === "step3") {
      const step1Completed = localStorage.getItem("step1_completed") === "true";
      const step2Completed = localStorage.getItem("step2_completed") === "true";

      if (!step1Completed || !step2Completed) {
        navigate(`/blocked?reason=step_sequence&redirect=${step1Completed ? "/verify/step2" : "/verify/step1"}`, {
          replace: true,
        });
        return;
      }
    }

    if (selectedProvider === "linkvertise") {
      if (isBlockedDomain(referrerDomain)) {
        navigate("/blocked?reason=suspicious_activity&redirect=/verify/provider-select", { replace: true });
        return;
      }

      if (!hash || !isApprovedDomain(referrerDomain)) {
        navigate(`/blocked?reason=suspicious_activity&redirect=/verify/${currentStep}`, { replace: true });
        return;
      }
      // the server records this step (+ Linkvertise's one-time hash) and refuses a chain that is out of order, too
      // fast or reuses a hash. A network hiccup lets them continue (the final token check is what counts).
      if (!early) {
        const rep = await reportStep({ action: "step", sid: verifySid() || "", step: currentStep, hash });
        if (cancelled) return;
        if (!rep.ok && rep.reason !== "network" && rep.reason !== "repeat") {
          navigate(`/blocked?reason=suspicious_activity&redirect=/verify/step1`, { replace: true });
          return;
        }
      }
    }
    }

    try {
      localStorage.setItem(`${currentStep}_completed`, "true");
      localStorage.removeItem("verification_step");
    } catch { /* storage blocked */ }
    setCompletedStep(currentStep);

    const isLast = currentStep === lastStep;
    setIsFinalStep(isLast);
    toast({
      title: t("Verification Successful"),
      description: isLast ? t("All verification steps completed!") : t("Step {n} has been completed.").replace("{n}", currentStep.replace("step", "")),
    });
    setIsLoading(false);

    // On the FINAL step (step2 in 2-step mode, step3 in 3-step), request a server-issued
    // verify token so generate-hwid-key can confirm a real verified user, then go to the key.
    if (isLast) {
      // 2026-11-19: retry (the step-3 report may still be landing, or the network blipped). Before, one failed call was
      // only logged: the player saw "All steps completed", picked a game, and was then bounced to the start.
      const getToken = async () => {
        for (let i = 0; i < 3; i++) {
          if (i) await new Promise((r) => setTimeout(r, 1500 * i));
          if (cancelled) return;
          try {
            const { data, error } = await supabase.functions.invoke("issue-verify-token", { body: { sid: verifySid() || "" } });
            if (!error && data?.success && data?.token) {
              try { localStorage.setItem("verify_token", JSON.stringify({ token: data.token, expires_at: data.expires_at, hours: data.hours })); } catch { /* ignore */ }
              return;
            }
            let reason = "";
            try { const j = await (error as any)?.context?.json?.(); reason = j?.reason || ""; } catch { /* keep */ }
            if (data?.reason) reason = data.reason;
            console.warn("[AdReturn] issue-verify-token failed", reason || error || data);
            // "used" = this run already has its token (a reload): nothing to retry
            if (reason === "used") return;
          } catch (err) {
            console.warn("[AdReturn] issue-verify-token error", err);
          }
        }
      };
      getToken().finally(() => {
          try { localStorage.setItem("cw_lv_done", JSON.stringify({ step: currentStep, next: "/access-key", at: Date.now() })); } catch { /* ignore */ }
          timeoutId = window.setTimeout(() => { if (!cancelled) navigate("/access-key", { replace: true }); }, 800);
      });
    } else {
      try { localStorage.setItem("cw_lv_done", JSON.stringify({ step: currentStep, next: NEXT_ROUTE[currentStep], at: Date.now() })); } catch { /* ignore */ }
      timeoutId = window.setTimeout(() => { if (!cancelled) navigate(NEXT_ROUTE[currentStep], { replace: true }); }, 1500);
    }
    })();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, toast, routeStep, queryStep, hash]);

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
            <CardTitle>{isFinalStep ? t("Final Verification") : t("Verification")}</CardTitle>
            <CardDescription>{t("Processing your verification...")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
                <p className="mt-4 text-center text-muted-foreground">{t("Verifying your completion...")}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <p className="mt-4 text-center font-medium">
                  {isFinalStep ? t("All verification steps completed!") : t("Step {n} completed.").replace("{n}", completedStep?.replace("step", "") || "")}
                </p>
                <p className="text-center text-muted-foreground">
                  {isFinalStep ? t("Redirecting to your key...") : t("Redirecting to the next step...")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
