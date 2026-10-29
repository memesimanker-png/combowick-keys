import React, { useState, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Youtube, MessageCircle, X, CheckCircle2, Lock, Loader2, MousePointerClick, Zap, Link2, ArrowLeft, ArrowRight, ThumbsUp, Crown, KeyRound, Gamepad2, ClipboardPaste } from "lucide-react";
import { YouTubeVideoPlayer } from "@/components/YouTubeVideoPlayer";
import { VerifyCard, VerifyHeader } from "@/components/VerifyShell";
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
import { RequestStrip } from "@/components/RequestWidget";
import { useCpaOffers, getCpaSubid, cpaSession, cpaTrack } from "@/lib/cpa";


const YOUTUBE_URL = "https://www.youtube.com/@Triple_WICK";
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
// Owner 2026-10-28: the ad-button clicks are replaced by Subscribe + Like on TRIPLE_WICK.
// Done once, this device skips the step for a week.
const LIKE_VIDEO_URL = "https://www.youtube.com/watch?v=WIxl2ehPFrs"; // Bike Universe long-form
const SUB_LIKE_WAIT_SECONDS = 5;
const SUB_LIKE_DONE_AT = "sub_like_done_at";
const SUB_LIKE_SKIP_MS = 7 * 24 * 60 * 60 * 1000;
const subLikeRecentlyDone = () => {
  try { const at = Number(localStorage.getItem(SUB_LIKE_DONE_AT)) || 0; return at > 0 && Date.now() - at < SUB_LIKE_SKIP_MS; } catch { return false; }
};

export default function VerifyProviderSelect() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { isAdEnabled } = useAdSettings();
  const [mounted, setMounted] = useState(false);

  const [showSubscriptionGate, setShowSubscriptionGate] = useState(false);

  const [youtubeCompleted, setYoutubeCompleted] = useState(false);
  const [discordCompleted, setDiscordCompleted] = useState(false);
  const [youtubeTimer, setYoutubeTimer] = useState(0);
  const [discordTimer, setDiscordTimer] = useState(0);
  // Free tile tapped while offers are available -> show the offer/Linkvertise choice under the tiles.
  const [freeOpen, setFreeOpen] = useState(false);
  const [likeCompleted, setLikeCompleted] = useState(false);
  const [likeTimer, setLikeTimer] = useState(0);
  const [subLikeSkip] = useState(subLikeRecentlyDone); // done within the last 7 days -> step hidden

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
    if (likeTimer > 0) {
      const interval = setInterval(() => {
        setLikeTimer((prev) => { if (prev <= 1) { setLikeCompleted(true); return 0; } return prev - 1; });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [likeTimer]);

  useEffect(() => {
    if (youtubeCompleted && likeCompleted) {
      try { localStorage.setItem(SUB_LIKE_DONE_AT, String(Date.now())); } catch { /* ignore */ }
    }
  }, [youtubeCompleted, likeCompleted]);

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

  const handleSubscribeClick = () => {
    window.open(YOUTUBE_URL + "?sub_confirmation=1", "_blank");
    setYoutubeTimer(SUB_LIKE_WAIT_SECONDS);
  };

  const handleLikeClick = () => {
    window.open(LIKE_VIDEO_URL, "_blank");
    setLikeTimer(SUB_LIKE_WAIT_SECONDS);
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

  // Owner 2026-10-13: never auto-jump to Linkvertise — after the ad clicks the visitor picks
  // Linkvertise or Premium themselves (renderLinkvertiseChoice). Kept off on purpose.
  const AUTO_ADVANCE = false;
  useEffect(() => {
    if (!AUTO_ADVANCE) return;
    if (starting || showSubscriptionGate) return;
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
  }, [directLinkClicks, requiredClicks, starting, showSubscriptionGate, cpa.status, cpaAvailable, lvEnabled, cpa.blocked, cpa.lockerOk, lvChoice]);

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

  // Subscribe + Like (replaced the ad-button clicks). Hidden for a week once done on this device.
  const subLikeDone = subLikeSkip || (youtubeCompleted && likeCompleted);
  const likeProgress = likeTimer > 0 ? ((SUB_LIKE_WAIT_SECONDS - likeTimer) / SUB_LIKE_WAIT_SECONDS) * 100 : likeCompleted ? 100 : 0;
  const subProgress = youtubeTimer > 0 ? ((SUB_LIKE_WAIT_SECONDS - youtubeTimer) / SUB_LIKE_WAIT_SECONDS) * 100 : youtubeCompleted ? 100 : 0;

  if (!subLikeSkip) {
    steps.push({
      key: "sub-like",
      title: t("Subscribe & Like (once per week)"),
      done: subLikeDone,
      icon: <Youtube className="h-4 w-4" />,
      render: () => (
        <div className="space-y-2">
          <Button onClick={handleSubscribeClick} disabled={youtubeCompleted || youtubeTimer > 0} className="w-full bg-red-600 hover:bg-red-700">
            <Youtube className="mr-2 h-4 w-4" />
            {youtubeCompleted ? `✓ ${t("YouTube Subscribed")}` : youtubeTimer > 0 ? t("Waiting {n}s...").replace("{n}", String(youtubeTimer)) : t("Subscribe to YouTube")}
          </Button>
          {youtubeTimer > 0 && <Progress value={subProgress} className="h-1" />}
          <Button onClick={handleLikeClick} disabled={likeCompleted || likeTimer > 0} className="w-full bg-red-600 hover:bg-red-700">
            <ThumbsUp className="mr-2 h-4 w-4" />
            {likeCompleted ? `✓ ${t("Video Liked")}` : likeTimer > 0 ? t("Waiting {n}s...").replace("{n}", String(likeTimer)) : t("Like the Video")}
          </Button>
          {likeTimer > 0 && <Progress value={likeProgress} className="h-1" />}
        </div>
      ),
    });
  }

  // Ad-button clicks come back AFTER Subscribe + Like (owner 2026-10-28: it was ~37% of Monetag).
  // Still skipped for DL_COOLDOWN_MS once done (dlSkip).
  const directLinkAdEnabled = isAdEnabled("verify-provider-select", "direct_link");
  const adClicksDone = !directLinkAdEnabled || directLinkClicks >= requiredClicks;

  if (directLinkAdEnabled && !dlSkip) {
    steps.push({
      key: "direct-link",
      title: t("Process Free Access"),
      done: adClicksDone,
      icon: <MousePointerClick className="h-4 w-4" />,
      render: () => (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {requiredClicks === 1
              ? t("Click the button once to process your free access.")
              : t("Click the button {n} times to process your free access.").replace("{n}", String(requiredClicks))}
          </p>
          <Button onClick={handleDirectLinkClick} className="w-full gap-2" disabled={adClicksDone}>
            <MousePointerClick className="h-4 w-4" />
            {adClicksDone
              ? `✓ ${t("Processing Complete")}`
              : `${t("Click Ad Button")} (${directLinkClicks}/${requiredClicks})`}
          </Button>
          <Progress value={(directLinkClicks / requiredClicks) * 100} className="h-1" />
        </div>
      ),
    });
  }

  const directLinkDone = subLikeDone && adClicksDone;

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

  // Offer wall off: Linkvertise (main) or Premium. Nothing happens until the visitor taps.
  const renderLinkvertiseChoice = () => (
    <div className="space-y-3">
      <div className="cw-glow">
        <button type="button" onClick={handleStart} disabled={starting}
          className="relative flex w-full items-center gap-3 rounded-[calc(0.5rem-1.5px)] bg-gradient-to-br from-primary/15 to-primary/5 p-4 text-left transition-colors hover:from-primary/25 disabled:opacity-70">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
            {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Link2 className="h-5 w-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
              <span className="whitespace-nowrap">{t("Linkvertise steps")}</span>
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">{t("{n}-hour key").replace("{n}", String(keyHours.lv))}</span>
              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-green-300">{t("Free")}</span>
            </span>
            <span className="block text-xs font-medium text-foreground/80">{t("Complete {n} short Linkvertise checkpoints.").replace("{n}", String(verifySteps))}</span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
        </button>
      </div>
      <a href="/premium-keys"
        className="flex w-full items-center gap-3 rounded-lg border border-border bg-secondary/30 p-4 text-left transition-colors hover:border-primary/50">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"><Zap className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 font-semibold">
            <span>{t("Premium Keys")}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{t("No ads")}</span>
          </span>
          <span className="block text-xs text-muted-foreground">{t("Skip every step. One key for every game.")}</span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </a>
    </div>
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
    title: t("Choose How to Get Your Key"),
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
      : renderLinkvertiseChoice()
  });

  // ── Redesign (owner 2026-10-29, mockups/keypage-v3*.html): 3 sections in one gold card ──
  // 1 Subscribe & Like (video inside, once a week) · 2 Free or Premium tiles · 3 the checkpoint path.
  const subLikeStep = steps.find((s) => s.key === "sub-like");
  const unlockStep = steps[steps.length - 1];
  const percent = subLikeDone ? 50 : 0;
  // Plain Linkvertise path (no offers in this country): the Free tile starts the checkpoints directly.
  const plainLv = cpa.status !== "loading" && !cpaAvailable && lvEnabled && !(lvEnabled && !lvChoice && !cpa.blocked && cpa.lockerOk !== false);
  const startFree = () => { if (plainLv) handleStart(); else setFreeOpen(true); };
  const sectionCls = (state: "done" | "active" | "locked") =>
    `border-b border-border/50 p-4 last:border-b-0 sm:px-7 sm:py-5 ${state === "active" ? "bg-primary/5" : state === "locked" ? "opacity-45" : ""}`;
  const SectionHead = ({ n, title, state, meta }: { n: number; title: string; state: "done" | "active" | "locked"; meta?: ReactNode }) => (
    <div className="flex items-center gap-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold sm:h-9 sm:w-9 ${
        state === "done" ? "bg-green-500/20 text-green-300" : state === "active" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
        {state === "done" ? <CheckCircle2 className="h-4 w-4" /> : n}
      </span>
      <h3 className="text-sm font-bold sm:text-base">{title}</h3>
      <span className={`ml-auto text-xs ${state === "done" ? "font-semibold text-green-400" : "text-muted-foreground"}`}>{meta}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-black/70 flex flex-col">
      <NoIndex />
      <AdBlockGate page="verify-provider-select" />
      <DiscountNotification startMinimized />

      <FunnelHeader title={t("ComboWick Verify")} short="CW_V™" />

      <main className="flex-1 container flex flex-col items-center justify-start px-3 pt-4 pb-36 sm:px-8 sm:py-10">
        <div className="w-full space-y-4">
          <VerifyCard>
            <VerifyHeader title={t("Get Your Free Key")} sub={t("3 quick sections. About 2 minutes.")} percent={percent} />
            <RequestStrip />

            {keyLimited ? (
              <div className="p-4 sm:px-7 sm:py-5"><KeyLimitNotice resetsAt={keyQuota?.resets_at} limit={keyQuota?.limit} /></div>
            ) : (
              <>
                {/* 1 · Subscribe & Like (the video they like sits right here) */}
                {subLikeStep && !subLikeDone ? (
                  <section className={sectionCls("active")}>
                    <SectionHead n={1} title={t("Subscribe & Like")} state="active" meta={t("once a week")} />
                    <div className="mt-4 grid items-center gap-4 sm:grid-cols-[1.35fr_1fr] sm:gap-6">
                      <YouTubeVideoPlayer step="provider-select" allowPause />
                      <div>
                        <p className="mb-3 text-sm text-foreground/85">{t("Subscribe to the channel, then like this video. You only do this once a week.")}</p>
                        {subLikeStep.render()}
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className={sectionCls("done")}>
                    <SectionHead n={1} title={t("Subscribe & Like")} state="done" meta={t("Done")} />
                  </section>
                )}

                {/* 2 · Free or Premium */}
                <section className={sectionCls(subLikeDone ? "active" : "locked")}>
                  <SectionHead n={2} title={t("Choose Free or Premium")} state={subLikeDone ? "active" : "locked"} meta={subLikeDone ? undefined : <Lock className="h-3.5 w-3.5" />} />
                  {subLikeDone && (
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                        <div className="flex flex-col rounded-xl border-[1.5px] border-primary bg-gradient-to-br from-primary/20 to-primary/5 p-3 sm:p-5">
                          <span className="mb-2 self-start rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-green-300">{t("Free")}</span>
                          <p className="mb-2 text-base font-bold sm:text-xl">{t("Free Key")}</p>
                          <ul className="mb-3 space-y-1 text-xs text-foreground/85 sm:text-sm">
                            <li>✓ {t("{n}-hour key").replace("{n}", String(keyHours.lv))}</li>
                            <li>✓ {t("{n} short checkpoints").replace("{n}", String(verifySteps))}</li>
                            {cpaAvailable ? <li>✓ {t("or 1 offer for a {n}-hour key").replace("{n}", String(keyHours.offer))}</li> : <li>✓ Linkvertise</li>}
                          </ul>
                          <Button onClick={startFree} disabled={starting || cpa.status === "loading"} className="mt-auto h-10 w-full font-bold sm:h-11">
                            {starting || cpa.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("Start free")} <ArrowRight className="ml-1 h-4 w-4" /></>}
                          </Button>
                        </div>
                        <a href="/premium-keys" data-no-popunder className="flex flex-col rounded-xl border border-border bg-secondary/40 p-3 transition-colors hover:border-primary/50 sm:p-5">
                          <span className="mb-2 self-start rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary-foreground">{t("No ads")}</span>
                          <p className="mb-2 text-base font-bold sm:text-xl">{t("Premium")}</p>
                          <ul className="mb-3 space-y-1 text-xs text-foreground/85 sm:text-sm">
                            <li>✓ {t("Key in seconds")}</li>
                            <li>✓ {t("No checkpoints")}</li>
                            <li>✓ {t("Every game")}</li>
                          </ul>
                          <span className="mt-auto flex h-10 w-full items-center justify-center gap-1 rounded-md border border-primary/40 text-sm font-bold sm:h-11">
                            {t("See Premium")} <ArrowRight className="h-4 w-4" />
                          </span>
                        </a>
                      </div>
                      {freeOpen && !plainLv && <div className="pt-1">{unlockStep.render()}</div>}
                    </div>
                  )}
                </section>

                {/* 3 · the path to the key */}
                <section className={sectionCls(subLikeDone ? "active" : "locked")}>
                  <SectionHead n={3} title={t("Get Your Key")} state={subLikeDone ? "active" : "locked"} meta={subLikeDone ? undefined : <Lock className="h-3.5 w-3.5" />} />
                  {subLikeDone && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {Array.from({ length: verifySteps }, (_, i) => (
                        <span key={i} className="flex items-center gap-1.5">
                          <span className="rounded-full border border-border bg-secondary px-2.5 py-1">{t("Checkpoint")} {i + 1}</span>
                          <span className="opacity-60">→</span>
                        </span>
                      ))}
                      <span className="rounded-full border border-primary/40 px-2.5 py-1 font-bold text-primary">🔑 {t("Your key")}</span>
                    </div>
                  )}
                </section>
              </>
            )}
          </VerifyCard>

          <p className="text-center text-xs text-muted-foreground">
            {t("Stuck?")} <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline">{t("Open a ticket in our Discord")}</a>
          </p>

        </div>
      </main>
    </div>
  );
}
