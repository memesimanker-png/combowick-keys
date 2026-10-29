import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ExternalLink } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { YouTubeVideoPlayer } from "@/components/YouTubeVideoPlayer";
import { buildLinkvertiseUrl } from "@/lib/linkvertise";
import { useVerifyLinks } from "@/hooks/useVerifyLinks";
import { useTranslation } from "@/lib/translation-context";
import { NoIndex } from "@/components/NoIndex";
import { AdBlockGate } from "@/components/AdBlockGate";
import { useLinkvertiseGuard } from "@/hooks/useLinkvertiseGuard";
import { useAdSettings } from "@/hooks/useAdSettings";
import { usePopunder } from "@/hooks/usePopunder";
import { DiscountNotification } from "@/components/DiscountNotification";
import { FunnelHeader } from "@/components/FunnelHeader";
import { CheckpointLayout, useVerifySteps } from "@/components/VerifyShell";
import { supabase } from "@/integrations/supabase/client";


export default function VerifyStep3() {
  useLinkvertiseGuard();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const verifySteps = useVerifySteps();
  const { isAdEnabled } = useAdSettings();
  // Monetag popunder lives on the verify steps (2 & 3), not the key-generation page.
  usePopunder(isAdEnabled("verify-step3", "popunder"));
  const [isLoading, setIsLoading] = useState(false);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>("linkvertise");
  const links = useVerifyLinks();

  useEffect(() => {
    const step2Done = localStorage.getItem("step2_completed");
    if (!step2Done) {
      toast({ variant: "destructive", title: t("Access Denied"), description: t("verify_access_denied_step2") });
      navigate("/verify/step1");
      return;
    }
    // In 2-step mode there is no Step 3 — step 2 was the final step, so go to the key.
    supabase.from("verify_settings").select("verify_steps").eq("id", 1).maybeSingle().then(({ data }) => {
      if ((data as any)?.verify_steps === 2) navigate("/access-key", { replace: true });
    });
    const provider = localStorage.getItem("selected_ad_provider");
    setSelectedProvider(provider);
  }, [navigate, toast, t]);

  const handleVerification = () => {
    setIsLoading(true);
    localStorage.setItem("selected_ad_provider", "linkvertise");
    localStorage.setItem("verification_step", "step3");
    const returnUrl = `${window.location.origin}/ad-return/step3`;
    window.location.href = buildLinkvertiseUrl(links[2], returnUrl);
  };

  return (
    <div className="min-h-screen bg-black/70 flex flex-col">
      <NoIndex />
      <AdBlockGate page="verify-step3" />
      <DiscountNotification startMinimized />
      <FunnelHeader title={t("ComboWick Verify")} short="CW_V™" />
      <main className="flex-1 container flex flex-col items-center justify-start px-3 pt-4 pb-36 sm:px-8 sm:py-10">
        <CheckpointLayout
          n={3}
          steps={verifySteps}
          video={<YouTubeVideoPlayer step="step3" timerSeconds={4} onTimerComplete={() => setButtonEnabled(true)} />}
          button={
            <Button className="h-12 w-full text-[15px] font-bold" onClick={handleVerification} disabled={isLoading || !buttonEnabled}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {isLoading ? t("Processing...") : !buttonEnabled ? `${t("Please wait")}…` : t("Finish & Get My Key")}
            </Button>
          }
        />
      </main>
    </div>
  );
}
