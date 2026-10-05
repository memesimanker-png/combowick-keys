import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Youtube, MessageCircle, X, CheckCircle2, Lock, Loader2, MousePointerClick, Zap, Link2, ArrowLeft, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LanguageSelector } from "@/components/LanguageSelector";
import { supabase } from "@/integrations/supabase/client";
import { NoIndex } from "@/components/NoIndex";
import { AdBlockGate } from "@/components/AdBlockGate";
import { useAdSettings } from "@/hooks/useAdSettings";
import { lovable } from "@/integrations/lovable/index";
import { useTranslation } from "@/lib/translation-context";
import { DiscountNotification } from "@/components/DiscountNotification";
import { FunnelHeader } from "@/components/FunnelHeader";
import { CpaOfferWall } from "@/components/CpaOfferWall";
import { useKeyQuota, KeyLimitNotice } from "@/lib/key-quota";
import { useCpaOffers, getCpaSubid, cpaSession, cpaTrack } from "@/lib/cpa";


// "How to get a key" tutorial popup — off until the new video is recorded. Set true + swap the embed id to re-enable.
const SHOW_KEY_TUTORIAL = false;
const YOUTUBE_URL = "https://www.youtube.com/@COMBO_WICK";
const DISCORD_URL = "https://discord.com/invite/9FWBQnVXCy";
const SUBSCRIPTION_GATE_DURATION_DAYS = 7;
const WAIT_TIME_SECONDS = 3;
const DIRECT_LINK_URL = "https://omg10.com/4/11703894";
const DEFAULT_DIRECT_LINK_CLICKS = 2;
// After the ad-button clicks are done, this browser skips the step for DL_COOLDOWN_MS (owner: repeat
// clicks within a short time likely don't pay, so don't make returning visitors click again).
const DL_COOLDOWN_MS = 10 * 60 * 1000;
const DL_DONE_AT = "direct_link_done_at";
const dlRecentlyDone = () => {
  try { const at = Number(localStorage.getItem(DL_DONE_AT)) || 0; return at > 0 && Date.now() - at < DL_COOLDOWN_MS; } catch { return false; }
};

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
  const [dlSkip] = useState(dlRecentlyDone); // done within the last 10 min -> step counts as done
  useEffect(() => { if (dlSkip) setDirectLinkClicks(requiredClicks); }, [dlSkip, requiredClicks]);
  const [starting, setStarting] = useState(false);
  const [verifySteps, setVerifySteps] = useState(3); // 2 or 3, admin-configured
  // CPA offer wall — offered as a choice next to Linkvertise (admin toggle verify_settings.cpa_enabled).
  const [cpaEnabled, setCpaEnabled] = useState<boolean | null>(null);
  const cpa = useCpaOffers(cpaEnabled);
  const cpaAvailable = cpa.status === "ready";
  const [choice, setChoice] = useState<string | null>(() => cpaSession.getChoice());
  // Admin can pause the Linkvertise option (verify_settings.linkvertise_choice). Only affects the
  // choice screen — countries with no offers still go through Linkvertise so nobody gets stuck.
  const [lvChoice, setLvChoice] = useState(true);
  // Master switch (verify_settings.linkvertise_enabled). OFF = no Linkvertise anywhere in the free-key
  // flow: no auto-jump to Step 1, no Linkvertise card / stuck button; no-offer visitors get Alternate offers.
  const [lvEnabled, setLvEnabled] = useState(true);
  // Key length per unlock type (verify_settings.key_hours_*) — shown on each option.
  const [keyHours, setKeyHours] = useState({ offer: 24, cpc: 6, lv: 6 });
  const cpaSubid = React.useMemo(getCpaSubid, []);
  // Free-key limit (5 per 10h per IP) is checked up front — nobody should do an offer just to be refused.
  const keyQuota = useKeyQuota();
  const keyLimited = !!keyQuota?.limited;

  useEffect(() => {
    setMounted(true);

    const hideTutorial = localStorage.getItem("hide_tutorial_popup");
    if (SHOW_KEY_TUTORIAL && !hideTutorial) setShowTutorialPopup(true);

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
      .select("direct_link_clicks, verify_steps, cpa_enabled, linkvertise_choice, linkvertise_enabled, key_hours_offer, key_hours_cpc, key_hours_linkvertise")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as any;
        if (d?.direct_link_clicks) setRequiredClicks(d.direct_link_clicks);
        if (d?.verify_steps === 2 || d?.verify_steps === 3) setVerifySteps(d.verify_steps);
        setCpaEnabled(d?.cpa_enabled !== false);
        setLvChoice(d?.linkvertise_choice !== false && d?.linkvertise_enabled !== false);
        setLvEnabled(d?.linkvertise_enabled !== false);
        setKeyHours({
          offer: Number(d?.key_hours_offer) || 24,
          cpc: Number(d?.key_hours_cpc) || 6,
          lv: Number(d?.key_hours_linkvertise) || 6,
        });
      }, () => setCpaEnabled(false));
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
    // No toasts here: the button already shows the progress (n/N → ✓), and the toast lingered on
    // top of the page (it showed up again for users after a refresh).
    setDirectLinkClicks((prev) => {
      const next = Math.min(prev + 1, requiredClicks);
      localStorage.setItem("direct_link_clicks", String(next));
      if (next >= requiredClicks) {
        localStorage.setItem("direct_link_completed", "true");
        localStorage.setItem(DL_DONE_AT, String(Date.now())); // starts the 10-min skip
      }
      return next;
    });
  };

  const pickChoice = (c: "cpa" | "linkvertise") => {
    cpaTrack(cpaSubid, "tab", { kind: c === "cpa" ? "choice_cpa" : "choice_lv" });
    if (c === "linkvertise") { if (!lvChoice) return; cpaSession.setChoice(null); handleStart(); return; }
    cpaSession.setChoice("cpa");
    setChoice("cpa");
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
    // Wait for the offer check; if there are offers the visitor CHOOSES (no auto-advance).
    if (cpa.status === "loading" || cpaAvailable) return;
    if (!lvEnabled) return; // Linkvertise off: never auto-jump to it
    // No main offers but Alternate offers may work here -> show it with a Linkvertise option instead
    // of jumping. Auto-jump only when nothing else is left (VPN, or Alternate offers known empty).
    if (cpa.status === "none" && !cpa.blocked && cpa.lockerOk !== false && !lvChoice) return;
    const dlEnabled = isAdEnabled("verify-provider-select", "direct_link");
    const directLinkDone = !dlEnabled || directLinkClicks >= requiredClicks;
    if (!directLinkDone) return;
    const tmr = setTimeout(() => handleStart(), 900);
    return () => clearTimeout(tmr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directLinkClicks, requiredClicks, showTutorialPopup, starting, showSubscriptionGate, cpa.status, cpaAvailable, lvEnabled, cpa.blocked, cpa.lockerOk, lvChoice]);

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

  // Linkvertise is offered to everyone as the third option, but the wall only shows/unlocks it after
  // the visitor actually tried an offer (see CpaOfferWall LV_UNLOCK_MS).
  const lvHere = lvEnabled;

  const renderCpaChoice = () => (
    (choice === "cpa" || !lvChoice) ? (
      <div className="space-y-3">
        <CpaOfferWall offers={cpa.offers} subid={cpaSubid} country={cpa.country} hours={keyHours} onDone={() => navigate("/access-key")}
          allowLinkvertise={lvHere} lockerOk={cpa.lockerOk}
          linkvertiseOption={lvHere ? () => { cpaSession.setChoice(null); handleStart(); } : undefined}
          onStuckFallback={() => { cpaSession.setChoice(null); handleStart(); }} />
        {lvChoice && (
          <button type="button" onClick={() => { cpaSession.setChoice(null); setChoice(null); }} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> {t("Use the other method instead")}
          </button>
        )}
      </div>
    ) : (
      // Linkvertise is the main path (owner 2026-10-03: CPA networks earned far less); the offer is an
      // optional upgrade for a longer key.
      <div className="space-y-3">
        <div className="cw-glow">
        <button type="button" onClick={() => pickChoice("linkvertise")}
          className="relative flex w-full items-center gap-3 rounded-[calc(0.5rem-1.5px)] bg-gradient-to-br from-primary/15 to-primary/5 p-4 text-left transition-colors hover:from-primary/25">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary"><Link2 className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
              <span className="whitespace-nowrap">{t("Linkvertise steps")}</span>
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">{t("{n}-hour key").replace("{n}", String(keyHours.lv))}</span>
            </span>
            <span className="block text-xs font-medium text-foreground/80">{t("Complete {n} short Linkvertise checkpoints.").replace("{n}", String(verifySteps))}</span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
        </button>
        </div>
        <button type="button" onClick={() => pickChoice("cpa")}
          className="flex w-full items-center gap-3 rounded-lg border border-border bg-secondary/30 p-4 text-left transition-colors hover:border-primary/50">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"><Zap className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2 font-semibold">
              <span>{t("Complete 1 offer")}</span>
              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-green-300">{t("{n}-hour key").replace("{n}", String(keyHours.offer))}</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{t("Optional")}</span>
            </span>
            <span className="block text-xs text-muted-foreground">{t("Want a longer key? Do one quick task instead.")}</span>
          </span>
        </button>
        <p className="text-center text-[11px] text-muted-foreground">
          {t("Want to skip the tasks entirely?")} <a href="/premium-keys" className="text-primary underline">{t("Premium Keys")}</a>.
        </p>
      </div>
    )
  );

  // No main offers but Alternate offers may work: Alternate offers + the Linkvertise option.
  const renderAlternatePlusLinkvertise = () => (
    <div className="space-y-3">
      <CpaOfferWall offers={[]} subid={cpaSubid} country={cpa.country} hours={keyHours} onDone={() => navigate("/access-key")}
        allowLinkvertise={lvEnabled} alternateOnly lockerOk={cpa.lockerOk}
        linkvertiseOption={() => { cpaSession.setChoice(null); handleStart(); }}
        onStuckFallback={() => { cpaSession.setChoice(null); handleStart(); }} />
      <p className="text-center text-[11px] text-muted-foreground">
        {t("Want to skip the tasks entirely?")} <a href="/premium-keys" className="text-primary underline">{t("Premium Keys")}</a>.
      </p>
    </div>
  );

  // Linkvertise OFF and no main offers: VPN visitors are told to turn it off (CPALead blocks VPN
  // clicks); everyone else gets the Alternate offers (locker), with Premium as the paid way out.
  const renderNoLinkvertise = () => (
    cpa.blocked === "vpn" ? (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-5 text-center">
        <p className="font-semibold">{t("VPN or proxy detected")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("Offers don't work through a VPN. Turn it off, then tap Try again.")}</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
          {t("Try again")}
        </button>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {t("Want to skip the tasks entirely?")} <a href="/premium-keys" className="text-primary underline">{t("Premium Keys")}</a>.
        </p>
      </div>
    ) : (
      <div className="space-y-3">
        <CpaOfferWall offers={[]} subid={cpaSubid} country={cpa.country} hours={keyHours} onDone={() => navigate("/access-key")}
          allowLinkvertise={false} alternateOnly onStuckFallback={() => {}} />
        <p className="text-center text-[11px] text-muted-foreground">
          {t("Want to skip the tasks entirely?")} <a href="/premium-keys" className="text-primary underline">{t("Premium Keys")}</a>.
        </p>
      </div>
    )
  );

  steps.push({
    key: "unlock",
    title: cpaAvailable ? t("Choose How to Get Your Key") : t("Get Your Free Key"),
    done: false,
    icon: <CheckCircle2 className="h-4 w-4" />,
    // Order matters: the ad-click step first, then offers; the Linkvertise box below only shows when the
    // page is really sending this visitor to Linkvertise (VPN / nothing else available). It used to show
    // "Complete N Linkvertise steps" to EVERYONE while they were still clicking the ad button.
    render: () => !directLinkDone ? (
        <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6 text-center text-sm text-muted-foreground">
          {t("Finish the step above to continue…")}
        </div>
      )
      : cpa.status === "loading" ? (
        <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6 text-center text-sm">
          <span className="inline-flex items-center gap-2 font-medium text-primary"><Loader2 className="h-4 w-4 animate-spin" /> {t("Loading...")}</span>
        </div>
      )
      : cpaAvailable ? renderCpaChoice()
      : (lvEnabled && !lvChoice && !cpa.blocked && cpa.lockerOk !== false) ? renderAlternatePlusLinkvertise()
      : !lvEnabled ? renderNoLinkvertise()
      : (
      <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6 text-center">
        <p className="text-base font-semibold mb-2">
          {`Complete ${verifySteps} quick Linkvertise ${verifySteps === 1 ? "step" : "steps"} to get your key`}
        </p>
        <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
          {verifySteps === 2
            ? "You'll complete two short Linkvertise checkpoints (Step 1 → 2), then your HWID key unlocks."
            : "You'll complete three short Linkvertise checkpoints (Step 1 → 2 → 3), then your HWID key unlocks."}
        </p>
        <div className="flex items-center justify-center gap-2 text-primary font-medium">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("Starting verification...")}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">
          <>{t("Not redirecting?")} <button type="button" onClick={handleStart} className="text-primary underline">{t("Continue")}</button> · </>
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
      <AdBlockGate page="verify-provider-select" />
      <DiscountNotification startMinimized />

      {showTutorialPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="border-primary/30 w-full max-w-3xl relative animate-in fade-in zoom-in duration-300">
            <CardHeader className="border-b border-primary/20">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg sm:text-2xl">{t("FREE KEY TUTORIAL")}</CardTitle>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={handleNeverShowAgain} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
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

      <main className="flex-1 container flex flex-col items-center justify-start px-3 pt-4 pb-36 sm:justify-center sm:px-8 sm:py-8">
        <div className="max-w-xl w-full mx-auto space-y-4">
          <Card className="border-primary/30 overflow-hidden">
            <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl sm:text-2xl">{t("Verification")}</CardTitle>
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
              {keyLimited ? (
                <div className="p-4"><KeyLimitNotice resetsAt={keyQuota?.resets_at} limit={keyQuota?.limit} /></div>
              ) : (
              <ol className="divide-y divide-border/40">
                {steps.map((step, idx) => {
                  const isActive = idx === activeIdx || (!!step.optional && !step.done && (activeIdx === -1 || idx < activeIdx));
                  const isLocked = !step.optional && activeIdx !== -1 && idx > activeIdx;
                  const isDone = step.done;
                  return (
                    <li key={step.key} className={`p-4 sm:p-5 transition-colors ${isActive ? "bg-primary/5" : isDone ? "opacity-60" : isLocked ? "opacity-40" : ""}`}>
                      <div className="flex items-center gap-3 mb-3">
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
                      {isActive && <div className="sm:pl-11">{step.render()}</div>}
                    </li>
                  );
                })}
              </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
