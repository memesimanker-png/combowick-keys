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
import { canFireDirectLink, maybeFireDirectLink } from "@/lib/monetag";
import { DiscountNotification } from "@/components/DiscountNotification";
import { FunnelHeader } from "@/components/FunnelHeader";
import { CheckpointLayout, useVerifySteps } from "@/components/VerifyShell";


export default function VerifyStep1() {
  useLinkvertiseGuard();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const verifySteps = useVerifySteps();
  const { isAdEnabled } = useAdSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>("linkvertise");
  const links = useVerifyLinks();

  // Owner 2026-10-28: the ad-button step moved off the key page INTO this Proceed button (one sponsor tab,
  // "(1 ad)" label, 3-min cap in lib/monetag). Step 1's popunder is off by default now (admin toggle
  // verify-step1/popunder) so this tap never opens two ad tabs; the popunder stays on step 2.
  usePopunder(isAdEnabled("verify-step1", "popunder"));
  const sponsorOn = isAdEnabled("verify-step1", "direct_link");
  const [adNext] = useState(canFireDirectLink);

  useEffect(() => {
    localStorage.setItem("selected_ad_provider", "linkvertise");
    setSelectedProvider("linkvertise");
  }, []);

  const handleVerification = () => {
    if (sponsorOn) maybeFireDirectLink(); // before navigating, so the tap still counts as the user gesture
    setIsLoading(true);
    localStorage.setItem("verification_step", "step1");
    localStorage.setItem("selected_ad_provider", "linkvertise");
    const returnUrl = `${window.location.origin}/ad-return/step1`;
    window.location.href = buildLinkvertiseUrl(links[0], returnUrl);
  };

  return (
    <div className="min-h-screen bg-black/70 flex flex-col">
      <NoIndex />
      <AdBlockGate page="verify-step1" />
      <DiscountNotification startMinimized />
      <FunnelHeader title={t("ComboWick Verify")} short="CW_V™" />
      <main className="flex-1 container flex flex-col items-center justify-start px-3 pt-4 pb-36 sm:px-8 sm:py-10">
        <CheckpointLayout
          n={1}
          steps={verifySteps}
          video={<YouTubeVideoPlayer step="step1" timerSeconds={7} onTimerComplete={() => setButtonEnabled(true)} />}
          button={
            <Button className="h-12 w-full text-[15px] font-bold" onClick={handleVerification} disabled={isLoading || !buttonEnabled}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {isLoading ? t("Processing...") : !buttonEnabled ? `${t("Please wait")}…` : t("Continue to Checkpoint {n}").replace("{n}", "1")}
              {!isLoading && buttonEnabled && sponsorOn && adNext && ` (${t("1 ad")})`}
            </Button>
          }
        />
      </main>
    </div>
  );
}
