import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Shield, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { NoIndex } from "@/components/NoIndex";
import { supabase } from "@/integrations/supabase/client";

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
  const [isLoading, setIsLoading] = useState(true);
  const [completedStep, setCompletedStep] = useState<VerificationStep | null>(null);

  const queryStep = searchParams.get("step");
  const hash = searchParams.get("hash");

  useEffect(() => {
    let timeoutId: number | undefined;

    const currentStep = routeStep || queryStep || localStorage.getItem("verification_step");
    const selectedProvider = localStorage.getItem("selected_ad_provider") || "linkvertise";
    const pendingStep = localStorage.getItem("verification_step");
    const referrerDomain = extractDomain(document.referrer);

    if (!isVerificationStep(currentStep)) {
      navigate("/blocked?reason=step_sequence&redirect=/verify/provider-select", { replace: true });
      return;
    }

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
    }

    localStorage.setItem(`${currentStep}_completed`, "true");
    localStorage.removeItem("verification_step");
    setCompletedStep(currentStep);

    const message = getStepMessage(currentStep);
    toast({ title: message.title, description: message.description });
    setIsLoading(false);

    // On final step, request a server-issued verify token so generate-hwid-key
    // can confirm the request came from a real verified user (not curl/PS).
    if (currentStep === "step3") {
      supabase.functions
        .invoke("issue-verify-token", { body: {} })
        .then(({ data, error }) => {
          if (!error && data?.success && data?.token) {
            localStorage.setItem(
              "verify_token",
              JSON.stringify({ token: data.token, expires_at: data.expires_at }),
            );
          } else {
            console.warn("[AdReturn] issue-verify-token failed", error || data);
          }
        })
        .catch((err) => console.warn("[AdReturn] issue-verify-token error", err));
    }

    timeoutId = window.setTimeout(() => {
      navigate(NEXT_ROUTE[currentStep], { replace: true });
    }, 1500);

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [navigate, toast, routeStep, queryStep, hash]);

  const message = completedStep ? getStepMessage(completedStep) : null;

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
            <CardTitle>{completedStep === "step3" ? "Final Verification" : "Verification"}</CardTitle>
            <CardDescription>Processing your verification...</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
                <p className="mt-4 text-center text-muted-foreground">Verifying your completion...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <p className="mt-4 text-center font-medium">{message?.description}</p>
                <p className="text-center text-muted-foreground">{message?.redirectText}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
