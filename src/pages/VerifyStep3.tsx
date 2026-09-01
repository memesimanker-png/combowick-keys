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
import { LinkvertiseTimerNotice } from "@/components/LinkvertiseTimerNotice";
import { NoIndex } from "@/components/NoIndex";
import { SkipAdsBanner } from "@/components/SkipAdsBanner";
import { SkipAdsFloatButton } from "@/components/SkipAdsFloatButton";
import SlidingAd from "@/components/SlidingAd";
import { useAdSettings } from "@/hooks/useAdSettings";
import { DiscountNotification } from "@/components/DiscountNotification";


export default function VerifyStep3() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { isAdEnabled } = useAdSettings();
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
    <>
      <div className="min-h-screen bg-black/70 flex flex-col">
      <NoIndex />
      <DiscountNotification />
        {isAdEnabled("verify-step3", "skip_ads_banner") && <SkipAdsBanner />}
        <header className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">{t("ComboWick Verify")}</h1>
            </div>
            <LanguageSelector />
          </div>
        </header>
        <main className="flex-1 container flex flex-col items-center justify-center py-12">
          <div className="max-w-2xl w-full mx-auto space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-bold">{t("Verification Step 3")}</h1>
              <p className="text-muted-foreground">{t("verify_step3_desc")}</p>
            </div>
            <Card>
              <div className="p-6 pb-0">
                <YouTubeVideoPlayer step="step3" timerSeconds={4} onTimerComplete={() => setButtonEnabled(true)} />
              </div>
              <CardHeader>
                <CardTitle>{t("Final Verification")}</CardTitle>
                <CardDescription>{t("verify_watch_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedProvider && (
                  <div className="text-sm text-center">
                    <p>{t("Using provider:")} <span className="font-medium">
                      Linkvertise
                    </span></p>
                  </div>
                )}
                <LinkvertiseTimerNotice />
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full relative overflow-hidden group bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%_100%] hover:shadow-lg hover:shadow-primary/50 transition-all duration-300"
                  onClick={handleVerification}
                  disabled={isLoading || !buttonEnabled}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {isLoading ? t("Processing...") : t("Proceed to Final Verification")}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </main>
        {isAdEnabled("verify-step3", "skip_ads_float") && <SkipAdsFloatButton />}
        {isAdEnabled("verify-step3", "sliding_ad") && <SlidingAd />}
      </div>
    </>
  );
}
