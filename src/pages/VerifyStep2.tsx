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

// Seconds the continue button stays disabled so the Monetag popunder has time to
// fully load + register before the user leaves for Linkvertise.
const AD_LOAD_WAIT = 7;

export default function VerifyStep2() {
  useLinkvertiseGuard();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const verifySteps = useVerifySteps();
  const { isAdEnabled } = useAdSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AD_LOAD_WAIT);
  const [selectedProvider, setSelectedProvider] = useState<string | null>("linkvertise");
  const links = useVerifyLinks();

  // Monetag popunder now lives on Step 2 (moved off /verify/provider-select).
  usePopunder(true);

  // Hold the continue button until the popunder has had time to load.
  useEffect(() => {
    if (secondsLeft <= 0) { setButtonEnabled(true); return; }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  useEffect(() => {
    const step1Done = localStorage.getItem("step1_completed");
    if (!step1Done) {
      toast({ variant: "destructive", title: t("Access Denied"), description: t("verify_access_denied_step1") });
      navigate("/verify/step1");
      return;
    }
    const provider = localStorage.getItem("selected_ad_provider");
    setSelectedProvider(provider);
  }, [navigate, toast, t]);

  const handleVerification = () => {
    setIsLoading(true);
    localStorage.setItem("selected_ad_provider", "linkvertise");
    localStorage.setItem("verification_step", "step2");
    const returnUrl = `${window.location.origin}/ad-return/step2`;
    window.location.href = buildLinkvertiseUrl(links[1], returnUrl);
  };

  return (
    <div className="min-h-screen bg-black/70 flex flex-col">
      <NoIndex />
      <AdBlockGate page="verify-step2" />
      <DiscountNotification startMinimized />
      <FunnelHeader title={t("ComboWick Verify")} short="CW_V™" />
      <main className="flex-1 container flex flex-col items-center justify-start px-3 pt-4 pb-36 sm:px-8 sm:py-10">
        <CheckpointLayout
          n={2}
          steps={verifySteps}
          video={<YouTubeVideoPlayer step="step2" />}
          button={
            <Button className="h-12 w-full text-[15px] font-bold" onClick={handleVerification} disabled={isLoading || !buttonEnabled}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {isLoading ? t("Processing...") : !buttonEnabled ? `${t("Please wait")} ${secondsLeft}s…` : verifySteps === 2 ? t("Finish & Get My Key") : t("Continue to Checkpoint {n}").replace("{n}", "2")}
            </Button>
          }
        />
      </main>
    </div>
  );
}
