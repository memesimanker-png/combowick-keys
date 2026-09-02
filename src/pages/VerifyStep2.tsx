import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ExternalLink, Sparkles } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { YouTubeVideoPlayer } from "@/components/YouTubeVideoPlayer";
import { getTodaySchedule } from "@/lib/day-schedule";
import { buildLinkvertiseUrl } from "@/lib/linkvertise";
import { useVerifyLinks } from "@/hooks/useVerifyLinks";
import { useTranslation } from "@/lib/translation-context";
import { LinkvertiseTimerNotice } from "@/components/LinkvertiseTimerNotice";
import { supabase } from "@/integrations/supabase/client";
import { NoIndex } from "@/components/NoIndex";
import { SkipAdsBanner } from "@/components/SkipAdsBanner";
import { SkipAdsFloatButton } from "@/components/SkipAdsFloatButton";
import { useAdSettings } from "@/hooks/useAdSettings";
import { usePopunder } from "@/hooks/usePopunder";
import { DiscountNotification } from "@/components/DiscountNotification";
import { FunnelHeader } from "@/components/FunnelHeader";


export default function VerifyStep2() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { isAdEnabled } = useAdSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [buttonEnabled, setButtonEnabled] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string | null>("linkvertise");
  const links = useVerifyLinks();
  const [skipLoading, setSkipLoading] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const todaySchedule = getTodaySchedule();

  // Monetag popunder now lives on Step 2 (moved off /verify/provider-select).
  usePopunder(true);

  useEffect(() => {
    const step1Done = localStorage.getItem("step1_completed");
    if (!step1Done) {
      toast({ variant: "destructive", title: t("Access Denied"), description: t("verify_access_denied_step1") });
      navigate("/verify/step1");
      return;
    }
    const provider = localStorage.getItem("selected_ad_provider");
    setSelectedProvider(provider);

    // Check if user signed in with Google
    const checkGoogleUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.app_metadata?.provider === "google") {
          setIsGoogleUser(true);
        }
      } catch {
        setIsGoogleUser(false);
      }
    };
    checkGoogleUser();
  }, [navigate, toast, t]);

  const canSkip = isGoogleUser && todaySchedule.skipStep2;

  const handleSkipStep2 = () => {
    setSkipLoading(true);
    localStorage.setItem("step2_completed", "true");
    toast({ title: t("Step Skipped!"), description: t("verify_skip_desc") });
    setTimeout(() => navigate("/verify/step3"), 500);
  };

  const handleVerification = () => {
    setIsLoading(true);
    localStorage.setItem("selected_ad_provider", "linkvertise");
    localStorage.setItem("verification_step", "step2");
    const returnUrl = `${window.location.origin}/ad-return/step2`;
    window.location.href = buildLinkvertiseUrl(links[1], returnUrl);
  };

  return (
    <>
      <div className="min-h-screen bg-black/70 flex flex-col">
      <NoIndex />
      <DiscountNotification />
        {isAdEnabled("verify-step2", "skip_ads_banner") && <SkipAdsBanner />}
        <FunnelHeader title={t("ComboWick Verify")} />
        <main className="flex-1 container flex flex-col items-center justify-center py-12">
          <div className="max-w-2xl w-full mx-auto space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-bold">{t("Verification Step 2")}</h1>
              <p className="text-muted-foreground">{t("verify_step2_desc")}</p>
            </div>
            <Card>
              <div className="p-6 pb-0">
                <YouTubeVideoPlayer step="step2" />
              </div>
              <CardHeader>
                <CardTitle>{t("Second Verification")}</CardTitle>
                <CardDescription>{t("verify_watch_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {canSkip && (
                  <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-yellow-400 font-medium">
                      {todaySchedule.label} — {t("verify_skip_label")}
                    </p>
                  </div>
                )}
                {!isGoogleUser && todaySchedule.skipStep2 && (
                  <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-primary font-medium">
                      {t("Sign in with Google on the verification start page to skip this step on reward days!")}
                    </p>
                  </div>
                )}

                {selectedProvider && (
                  <div className="text-sm text-center">
                    <p>{t("Using provider:")} <span className="font-medium">
                      Linkvertise
                    </span></p>
                  </div>
                )}
                <LinkvertiseTimerNotice />
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                {canSkip && (
                  <Button className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold gap-2" onClick={handleSkipStep2} disabled={skipLoading}>
                    <Sparkles className="h-4 w-4" />
                    {skipLoading ? t("Skipping...") : t("Skip Step 2 (Reward Day)")}
                  </Button>
                )}
                <Button
                  className="w-full relative overflow-hidden group bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%_100%] hover:shadow-lg hover:shadow-primary/50 transition-all duration-300"
                  onClick={handleVerification}
                  disabled={isLoading || !buttonEnabled}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {isLoading ? t("Processing...") : t("Proceed to Verification")}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </main>
        {isAdEnabled("verify-step2", "skip_ads_float") && <SkipAdsFloatButton />}
      </div>
    </>
  );
}
