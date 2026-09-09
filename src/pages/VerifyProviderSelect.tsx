import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Youtube, MessageCircle, X, CheckCircle2, Lock, Loader2, MousePointerClick } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LanguageSelector } from "@/components/LanguageSelector";
import { supabase } from "@/integrations/supabase/client";
import { NoIndex } from "@/components/NoIndex";
import { useAdSettings } from "@/hooks/useAdSettings";
import { lovable } from "@/integrations/lovable/index";
import { useTranslation } from "@/lib/translation-context";
import { DiscountNotification } from "@/components/DiscountNotification";
import { FunnelHeader } from "@/components/FunnelHeader";


const YOUTUBE_URL = "https://www.youtube.com/@COMBO_WICK";
const DISCORD_URL = "https://discord.com/invite/9FWBQnVXCy";
const SUBSCRIPTION_GATE_DURATION_DAYS = 7;
const WAIT_TIME_SECONDS = 3;
const DIRECT_LINK_URL = "https://omg10.com/4/11703894";
const DEFAULT_DIRECT_LINK_CLICKS = 2;

export default function VerifyProviderSelect() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { isAdEnabled } = useAdSettings();
  const [mounted, setMounted] = useState(false);

  const [showTutorialPopup, setShowTutorialPopup] = useState(false);
  const [showSubscriptionGate, setShowSubscriptionGate] = useState(false);

  const [youtubeCompleted, setYoutubeCompleted] = useState(false);
  const [discordCompleted, setDiscordCompleted] = useState(false);
  const [youtubeTimer, setYoutubeTimer] = useState(0);
  const [discordTimer, setDiscordTimer] = useState(0);

  const [directLinkClicks, setDirectLinkClicks] = useState(0);
  const [requiredClicks, setRequiredClicks] = useState(DEFAULT_DIRECT_LINK_CLICKS);
  const [starting, setStarting] = useState(false);
  const [verifySteps, setVerifySteps] = useState(3); // 2 or 3, admin-configured

  useEffect(() => {
    setMounted(true);

    const hideTutorial = localStorage.getItem("hide_tutorial_popup");
    if (!hideTutorial) setShowTutorialPopup(true);

    // Subscribe-to-YouTube / Join-Discord gate REMOVED per owner — never enable it.
    // (State + handlers left inert below; the step never renders and never blocks
    // the auto-advance guard on line ~146.)
    setShowSubscriptionGate(false);

    // Fresh run of the 3-step Linkvertise flow.
    localStorage.removeItem("step1_completed");
    localStorage.removeItem("step2_completed");
    localStorage.removeItem("step3_completed");
    localStorage.removeItem("verification_step");
    localStorage.removeItem("direct_link_completed");
    localStorage.removeItem("direct_link_clicks");
    localStorage.setItem("selected_ad_provider", "linkvertise");

    supabase
      .from("verify_settings")
      .select("direct_link_clicks, verify_steps")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as any;
        if (d?.direct_link_clicks) setRequiredClicks(d.direct_link_clicks);
        if (d?.verify_steps === 2 || d?.verify_steps === 3) setVerifySteps(d.verify_steps);
      });
  }, []);

  // Popunder intentionally NOT loaded here — it now lives on /verify/step2 only.

  useEffect(() => {
    if (youtubeTimer > 0) {
      const interval = setInterval(() => {
        setYoutubeTimer((prev) => { if (prev <= 1) { setYoutubeCompleted(true); return 0; } return prev - 1; });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [youtubeTimer]);

  useEffect(() => {
    if (discordTimer > 0) {
      const interval = setInterval(() => {
        setDiscordTimer((prev) => { if (prev <= 1) { setDiscordCompleted(true); return 0; } return prev - 1; });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [discordTimer]);

  useEffect(() => {
    if (youtubeCompleted && discordCompleted && showSubscriptionGate) {
      localStorage.setItem("subscription_gate_completed", new Date().toISOString());
      setShowSubscriptionGate(false);
      toast({ title: t("Thank You!"), description: t("Subscription requirements completed.") });
    }
  }, [youtubeCompleted, discordCompleted, showSubscriptionGate, toast, t]);

  const handleYoutubeClick = () => {
    window.open(YOUTUBE_URL, "_blank");
    setYoutubeTimer(WAIT_TIME_SECONDS);
    toast({ title: t("Opening YouTube"), description: t("Please subscribe and wait a few seconds...") });
  };

  const handleDiscordClick = () => {
    window.open(DISCORD_URL, "_blank");
    setDiscordTimer(WAIT_TIME_SECONDS);
    toast({ title: t("Opening Discord"), description: t("Please join and wait a few seconds...") });
  };

  const handleDirectLinkClick = () => {
    window.open(DIRECT_LINK_URL, "_blank", "noopener,noreferrer");
    setDirectLinkClicks((prev) => {
      const next = Math.min(prev + 1, requiredClicks);
      localStorage.setItem("direct_link_clicks", String(next));
      if (next >= requiredClicks) {
        localStorage.setItem("direct_link_completed", "true");
        toast({ title: t("Processing Complete"), description: t("You can continue to unlock your key now.") });
      } else {
        toast({ title: t("One More Click"), description: t("Click the button one more time to process.") });
      }
      return next;
    });
  };

  // Start the 3-step Linkvertise verification.
  const handleStart = () => {
    setStarting(true);
    localStorage.setItem("selected_ad_provider", "linkvertise");
    // Hard navigation (not SPA) so the Monetag popunder script loaded on this page
    // is cleared before step1 — keeps the popunder off the verification steps.
    window.location.href = "/verify/step1";
  };

  // Auto-advance to Step 1 once the Monetag direct-link clicks are done — no manual button.
  useEffect(() => {
    if (showTutorialPopup || starting || showSubscriptionGate) return;
    const dlEnabled = isAdEnabled("verify-provider-select", "direct_link");
    const directLinkDone = !dlEnabled || directLinkClicks >= requiredClicks;
    if (!directLinkDone) return;
    const tmr = setTimeout(() => handleStart(), 900);
    return () => clearTimeout(tmr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directLinkClicks, requiredClicks, showTutorialPopup, starting, showSubscriptionGate]);

  const handleCloseTutorial = () => setShowTutorialPopup(false);
  const handleNeverShowAgain = () => {
    localStorage.setItem("hide_tutorial_popup", "true");
    setShowTutorialPopup(false);
    toast({ title: t("Tutorial Hidden"), description: t("You won't see this popup again.") });
  };

  if (!mounted) return null;

  const youtubeProgress = youtubeTimer > 0 ? ((WAIT_TIME_SECONDS - youtubeTimer) / WAIT_TIME_SECONDS) * 100 : youtubeCompleted ? 100 : 0;
  const discordProgress = discordTimer > 0 ? ((WAIT_TIME_SECONDS - discordTimer) / WAIT_TIME_SECONDS) * 100 : discordCompleted ? 100 : 0;

  type Step = { key: string; title: string; done: boolean; optional?: boolean; icon: React.ReactNode; render: () => React.ReactNode };
  const steps: Step[] = [];

  if (showSubscriptionGate) {
    steps.push({
      key: "subscribe",
      title: t("Subscribe & Join (once per week)"),
      done: youtubeCompleted && discordCompleted,
      icon: <Youtube className="h-4 w-4" />,
      render: () => (
        <div className="space-y-2">
          <Button onClick={handleYoutubeClick} disabled={youtubeCompleted || youtubeTimer > 0} className="w-full bg-red-600 hover:bg-red-700">
            <Youtube className="mr-2 h-4 w-4" />
            {youtubeCompleted ? `✓ ${t("YouTube Subscribed")}` : youtubeTimer > 0 ? t("Waiting {n}s...").replace("{n}", String(youtubeTimer)) : t("Subscribe to YouTube")}
          </Button>
          {youtubeTimer > 0 && <Progress value={youtubeProgress} className="h-1" />}
          <Button onClick={handleDiscordClick} disabled={discordCompleted || discordTimer > 0} className="w-full bg-indigo-600 hover:bg-indigo-700">
            <MessageCircle className="mr-2 h-4 w-4" />
            {discordCompleted ? `✓ ${t("Discord Joined")}` : discordTimer > 0 ? t("Waiting {n}s...").replace("{n}", String(discordTimer)) : t("Join Discord")}
          </Button>
          {discordTimer > 0 && <Progress value={discordProgress} className="h-1" />}
        </div>
      ),
    });
  }

  const directLinkAdEnabled = isAdEnabled("verify-provider-select", "direct_link");

  if (directLinkAdEnabled) {
    steps.push({
      key: "direct-link",
      title: t("Process Free Access"),
      done: directLinkClicks >= requiredClicks,
      icon: <MousePointerClick className="h-4 w-4" />,
      render: () => (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("Click the button {n} times to process your free access.").replace("{n}", String(requiredClicks))}
          </p>
          <Button onClick={handleDirectLinkClick} className="w-full gap-2" disabled={directLinkClicks >= requiredClicks}>
            <MousePointerClick className="h-4 w-4" />
            {directLinkClicks >= requiredClicks
              ? `✓ ${t("Processing Complete")}`
              : `${t("Click Ad Button")} (${directLinkClicks}/${requiredClicks})`}
          </Button>
          <Progress value={(directLinkClicks / requiredClicks) * 100} className="h-1" />
        </div>
      ),
    });
  }

  const directLinkDone = !directLinkAdEnabled || directLinkClicks >= requiredClicks;

  steps.push({
    key: "unlock",
    title: t("Get Your Free Key"),
    done: false,
    icon: <CheckCircle2 className="h-4 w-4" />,
    render: () => (
      <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6 text-center">
        <p className="text-base font-semibold mb-2">
          {`Complete ${verifySteps} quick Linkvertise ${verifySteps === 1 ? "step" : "steps"} to get your key`}
        </p>
        <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
          {verifySteps === 2
            ? "You'll complete two short Linkvertise checkpoints (Step 1 → 2), then your HWID key unlocks."
            : "You'll complete three short Linkvertise checkpoints (Step 1 → 2 → 3), then your HWID key unlocks."}
        </p>
        {directLinkDone ? (
          <div className="flex items-center justify-center gap-2 text-primary font-medium">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("Starting verification...")}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Finish the step above to continue…</p>
        )}
        <p className="mt-4 text-[11px] text-muted-foreground">
          {directLinkDone && <>Not redirecting? <button type="button" onClick={handleStart} className="text-primary underline">Continue</button> · </>}
          {t("Want to skip the tasks entirely?")} <a href="/premium-keys" className="text-primary underline">{t("Premium Keys")}</a>.
        </p>
      </div>
    ),
  });

  const activeIdx = steps.findIndex((s) => !s.done && !s.optional);
  const gateSteps = steps.slice(0, -1).filter((s) => !s.optional);
  const completedCount = gateSteps.filter((s) => s.done).length;
  const totalGates = gateSteps.length;
  const overallPercent = totalGates === 0 ? 100 : Math.round((completedCount / totalGates) * 100);

  return (
    <div className="min-h-screen bg-black/70 flex flex-col">
      <NoIndex />
      <DiscountNotification />

      {showTutorialPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="border-primary/30 w-full max-w-3xl relative animate-in fade-in zoom-in duration-300">
            <CardHeader className="border-b border-primary/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">{t("FREE KEY TUTORIAL")}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleNeverShowAgain} className="text-muted-foreground hover:text-foreground">
                    {t("Don't show again")}
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={t("Close tutorial")} onClick={handleCloseTutorial} className="h-10 w-10">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>{t("Watch this quick tutorial to learn how to get your free key")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="aspect-video rounded-lg overflow-hidden border border-border/50">
                <iframe
                  src="https://www.youtube-nocookie.com/embed/zGkNbPgQQx4?rel=0"
                  title="Free Key Tutorial"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  className="w-full h-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <FunnelHeader title={t("ComboWick Verify")} short="CW_V™" />

      <main className="flex-1 container flex flex-col items-center justify-center py-8">
        <div className="max-w-xl w-full mx-auto space-y-4">
          <Card className="border-primary/30 overflow-hidden">
            <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-2xl">{t("Verification")}</CardTitle>
                  <CardDescription>{t("Complete the steps to unlock your free key.")}</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t("Progress")}</p>
                  <p className="text-lg font-bold text-primary">{overallPercent}%</p>
                </div>
              </div>
              <Progress value={overallPercent} className="h-1.5 mt-3" />
            </CardHeader>

            <CardContent className="p-0">
              <ol className="divide-y divide-border/40">
                {steps.map((step, idx) => {
                  const isActive = idx === activeIdx || (!!step.optional && !step.done && (activeIdx === -1 || idx < activeIdx));
                  const isLocked = !step.optional && activeIdx !== -1 && idx > activeIdx;
                  const isDone = step.done;
                  return (
                    <li key={step.key} className={`p-5 transition-colors ${isActive ? "bg-primary/5" : isDone ? "opacity-60" : isLocked ? "opacity-40" : ""}`}>
                      <div className="flex items-start gap-3 mb-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isDone ? "bg-green-500/20 text-green-300" : isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                        }`}>
                          {isDone ? <CheckCircle2 className="h-4 w-4" /> : isLocked ? <Lock className="h-3.5 w-3.5" /> : idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm flex items-center gap-2">
                            <span className="text-primary">{step.icon}</span>
                            {step.title}
                          </h3>
                        </div>
                      </div>
                      {isActive && <div className="pl-11">{step.render()}</div>}
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
