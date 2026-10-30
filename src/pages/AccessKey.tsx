import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, User, Clock, Shield, Key, Loader2, Code2, ExternalLink, Gamepad2 } from "lucide-react";
import { GamePicker } from "@/components/GamePicker";
import { waitLabel } from "@/lib/key-quota";
import type { GameItem } from "@/hooks/useGamesList";
import { useIsAdmin } from "@/hooks/useAuth";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/lib/translation-context";
import { FunnelHeader } from "@/components/FunnelHeader";
import { VerifyCard, VerifyHeader, CheckpointTracker, PremiumGlowBar, useVerifySteps } from "@/components/VerifyShell";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { NoIndex } from "@/components/NoIndex";
import { AdBlockGate } from "@/components/AdBlockGate";
import { useAdSettings } from "@/hooks/useAdSettings";
import { BugReportWidget } from "@/components/BugReportWidget";



interface StoredKeyData {
  key: string;
  expires_at: string;
  username?: string;
  generated_at: number;
  game_name?: string; // the ONE game this key works in — shown with the key so nobody mixes them up
  key_hours?: number; // real key length, for the "Time left" box (expires_at above is only the 10-min display window)
}

// Hours of the key this visitor earned (stored with the verify token: offer 24 / quick click 6 / Linkvertise 6).
// Fallback 6 = the shortest current key (click / Linkvertise); the old 11h default no longer exists.
function readPendingKeyHours(): number {
  try { const h = Number(JSON.parse(localStorage.getItem("verify_token") || "{}").hours); return h > 0 ? h : 6; } catch { return 6; }
}

// "Key #3 this week": this browser's own key history (made-at times, last 7 days), saved when a key is made
const KEY_LOG = "cw_key_log";
const WEEK_MS = 7 * 864e5;
function readKeyLog(): number[] {
  try {
    const a = JSON.parse(localStorage.getItem(KEY_LOG) || "[]");
    return Array.isArray(a) ? a.filter((x) => typeof x === "number" && Date.now() - x < WEEK_MS) : [];
  } catch { return []; }
}
function logKey(at: number): number[] {
  const a = [...readKeyLog(), at];
  try { localStorage.setItem(KEY_LOG, JSON.stringify(a.slice(-50))); } catch { /* private mode: count just won't stick */ }
  return a;
}

export default function AccessKey() {
  const pendingKeyHours = readPendingKeyHours();
  const [weekKeys, setWeekKeys] = useState<number[]>(readKeyLog);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
  const [keyGameName, setKeyGameName] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [keyExpiresAt, setKeyExpiresAt] = useState<string | null>(null);
  const [keyEndsAt, setKeyEndsAt] = useState<number | null>(null); // real end of the key (ms), when known
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((x) => x + 1), 30000); return () => clearInterval(id); }, []);
  const verifySteps = useVerifySteps();
  const [isLoading, setIsLoading] = useState(false);
  const [canGenerate, setCanGenerate] = useState(true);
  const [error, setError] = useState("");
  const [adClicks, setAdClicks] = useState(0);

  const [requiredClicks, setRequiredClicks] = useState(2);

  const { isAdEnabled } = useAdSettings();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  // Popunder moved OFF the key-generation page — it now lives on verify steps 2 & 3.
  const directLinkEnabled = isAdEnabled("access-key", "direct_link");
  const REQUIRED_AD_CLICKS = directLinkEnabled ? requiredClicks : 0;

  const DIRECT_LINK_URL = "https://omg10.com/4/11703894";

  // Verify steps are completed & load stored key (admins skip the whole verify flow)
  useEffect(() => {
    if (adminLoading) return; // wait until we know whether this is an admin
    let cancelled = false;
    (async () => {
      // Respect the admin's 2-vs-3 step setting — the final step is step2 (2-step) or step3 (3-step).
      let steps = 3;
      const { data } = await supabase
        .from("verify_settings")
        .select("access_key_clicks, verify_steps")
        .eq("id", 1)
        .maybeSingle();
      if (cancelled) return;
      const d = data as any;
      if (d?.verify_steps === 2 || d?.verify_steps === 3) steps = d.verify_steps;
      if (d?.access_key_clicks != null) setRequiredClicks(d.access_key_clicks);

      const finalStepDone = steps === 2
        ? localStorage.getItem("step2_completed")
        : localStorage.getItem("step3_completed");
      if (!isAdmin && !finalStepDone) {
        toast({ variant: "destructive", title: "Access Denied", description: "Please complete all verification steps." });
        navigate("/verify/provider-select");
        return;
      }

      loadStoredKeyData();
      checkExistingKey();
    })();
    return () => { cancelled = true; };
  }, [navigate, toast, isAdmin, adminLoading]);

  const loadStoredKeyData = () => {
    try {
      const storedData = localStorage.getItem("hwid_key_data");
      if (storedData) {
        const keyData: StoredKeyData = JSON.parse(storedData);
        const expiryDate = new Date(keyData.generated_at + 10 * 60 * 1000); // 10 minutes
        if (new Date() < expiryDate) {
          setGeneratedKey(keyData.key);
          setKeyExpiresAt(expiryDate.toISOString());
          setUsername(keyData.username || "");
          setKeyGameName(keyData.game_name || "");
          if (keyData.key_hours) setKeyEndsAt(keyData.generated_at + keyData.key_hours * 3600e3);
          setCanGenerate(false);
        } else {
          localStorage.removeItem("hwid_key_data");
        }
      }
    } catch {
      localStorage.removeItem("hwid_key_data");
    }
  };

  const checkExistingKey = async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("check-hwid-key-status", {
        body: {},
      });

      if (fnError) {
        console.error("Error checking existing key:", fnError);
        return;
      }

      if (data?.success && data?.hasActiveKey) {
        const now = Date.now();
        const expiryDate = new Date(now + 10 * 60 * 1000);

        const keyData: StoredKeyData = {
          key: data.key || "",
          expires_at: expiryDate.toISOString(),
          username: data.username,
          generated_at: now,
        };

        localStorage.setItem("hwid_key_data", JSON.stringify(keyData));
        setGeneratedKey(data.key || "");
        setKeyExpiresAt(expiryDate.toISOString());
        setCanGenerate(false);
      }
    } catch (err) {
      console.error("Error checking existing key:", err);
    }
  };

  // Expiry watcher
  useEffect(() => {
    if (keyExpiresAt) {
      const interval = setInterval(() => {
        if (new Date() >= new Date(keyExpiresAt)) {
          setCanGenerate(true);
          setGeneratedKey("");
          setKeyExpiresAt(null);
          localStorage.removeItem("hwid_key_data");
          toast({ title: "Key Expired", description: "Your access key has expired. Please verify again to generate a new key." });
          navigate("/verify/provider-select");
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [keyExpiresAt, toast, navigate]);


  const handleAdClick = () => {
    window.open(DIRECT_LINK_URL, "_blank", "noopener,noreferrer");
    setAdClicks((c) => c + 1);
  };

  const generateKey = async () => {
    if (!canGenerate || isLoading) return;
    if (!selectedGame) {
      setError(t("Please pick the game your key is for."));
      return;
    }
    if (!isAdmin && directLinkEnabled && adClicks < REQUIRED_AD_CLICKS) {
      handleAdClick();
      return;
    }
    setIsLoading(true);
    setError("");

    // Pull the server-issued verify token saved by /ad-return/step3
    let verifyToken: string | null = null;
    try {
      const raw = localStorage.getItem("verify_token");
      if (raw) {
        const parsed = JSON.parse(raw) as { token?: string; expires_at?: string };
        if (parsed?.token && parsed.expires_at && new Date(parsed.expires_at).getTime() > Date.now()) {
          verifyToken = parsed.token;
        } else {
          localStorage.removeItem("verify_token");
        }
      }
    } catch {
      localStorage.removeItem("verify_token");
    }

    if (!isAdmin && !verifyToken) {
      setError("Your verification expired. Please verify again.");
      toast({ variant: "destructive", title: "Verification required", description: "Please complete the verification steps again." });
      setIsLoading(false);
      navigate("/verify/provider-select");
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-hwid-key", {
        // universe id = the whole game (all its places); the key is locked to it at creation
        body: { username: username.trim() || undefined, verify_token: verifyToken, game_id: selectedGame.universe_id || selectedGame.game_id },
      });

      // Extract real server error message (supabase wraps non-2xx in FunctionsHttpError)
      let serverErr = "";
      if (fnError) {
        try {
          const ctx = (fnError as any)?.context;
          if (ctx && typeof ctx.json === "function") {
            const j = await ctx.json();
            serverErr = j?.error || j?.message || "";
            if (j?.code === "rate_limited") serverErr = t("You can get {n} free keys every 10 hours. Your next free key is available in {time}.").replace("{n}", "5").replace("{time}", waitLabel(j?.resets_at));
          }
        } catch { /* noop */ }
      }
      if (!serverErr && data && data.success === false) serverErr = data.error || "";

      if (fnError || (data && data.success === false)) {
        const msg = serverErr || "Failed to generate key. Please try again.";
        setError(msg);
        toast({ variant: "destructive", title: "Error", description: msg });
        // If verification failed/expired, clear token and bounce to verify
        if (/verification|verify/i.test(msg)) {
          localStorage.removeItem("verify_token");
          setIsLoading(false);
          navigate("/verify/provider-select");
          return;
        }
        setIsLoading(false);
        return;
      }

      // Token is single-use server-side; drop the cached copy regardless of outcome.
      localStorage.removeItem("verify_token");

      if (data?.success) {
        const now = Date.now();
        const expiryDate = new Date(now + 10 * 60 * 1000); // 10 minutes display timer

        const keyData: StoredKeyData = {
          key: data.key,
          expires_at: expiryDate.toISOString(),
          username: data.username || username.trim(),
          generated_at: now,
          game_name: selectedGame?.name,
          key_hours: Number(data.hours) || readPendingKeyHours(),
        };

        localStorage.setItem("hwid_key_data", JSON.stringify(keyData));
        setGeneratedKey(data.key);
        setKeyGameName(selectedGame?.name || "");
        setKeyEndsAt(now + keyData.key_hours! * 3600e3);
        setKeyExpiresAt(expiryDate.toISOString());
        setCanGenerate(false);
        setWeekKeys(logKey(now));

        toast({ title: "Key Generated!", description: `Your ${data.hours || readPendingKeyHours()}-hour HWID key has been generated.` });
      } else {
        setError(data?.error || "Failed to generate key");
        toast({ variant: "destructive", title: "Error", description: data?.error || "Failed to generate key." });
      }
    } catch (err) {
      console.error("Network error in generateKey:", err);
      setError("Network error occurred");
      toast({ variant: "destructive", title: "Error", description: "Network error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied!", description: "Key copied to clipboard." });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to copy to clipboard." });
    }
  };

  // Grab a key for a DIFFERENT game. Each key needs its own verification (the token is
  // single-use), so this resets the page and routes back through the verify flow — which is
  // also another ad pass, so it's win-win: better UX than a dead-end + more revenue per key.
  const startNewKey = () => {
    localStorage.removeItem("hwid_key_data");
    setGeneratedKey("");
    setKeyExpiresAt(null);
    setKeyEndsAt(null);
    setSelectedGame(null);
    setKeyGameName("");
    setUsername("");
    setCanGenerate(true);
    setError("");
    navigate("/verify/provider-select");
  };

  const formatTimeRemaining = () => {
    if (!keyExpiresAt) return "";
    const remaining = new Date(keyExpiresAt).getTime() - Date.now();
    if (remaining <= 0) return "Expired";
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const keyLeft = (() => {
    if (!keyEndsAt) return "";
    const ms = keyEndsAt - Date.now();
    if (ms <= 0) return t("Expired");
    return `${Math.floor(ms / 3600e3)}h ${Math.floor((ms % 3600e3) / 60e3)}m`;
  })();
  const fact = "rounded-xl border border-border bg-secondary/40 p-3";
  // last 7 days, oldest first: did this browser make a key that day? (today = last dot)
  const keyDays = (() => {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const s = d0.getTime() - (6 - i) * 864e5;
      return weekKeys.some((x) => x >= s && x < s + 864e5);
    });
  })();
  const weekN = weekKeys.length;

  return (
    <div className="min-h-screen bg-black/70 flex flex-col pb-40 sm:pb-0">{/* room for the floating Back button on phones */}
      <NoIndex />
      <AdBlockGate page="access-key" />
      <FunnelHeader title="COMBO WICK" />

      <main className="flex-1 container flex flex-col items-center justify-start px-3 pt-4 sm:px-8 sm:py-10">
        <div className="w-full space-y-4">
          <VerifyCard allowOverflow>
            <VerifyHeader
              title={generatedKey ? t("Your Key Is Ready") : t("Almost There")}
              sub={generatedKey ? t("Copy it and paste it in the hub.") : t("Pick the game you'll use it in.")}
              percent={100}
              tracker={<CheckpointTracker steps={verifySteps} current={verifySteps + 1} keyDone={!!generatedKey} />}
            />
            <div className="space-y-4 p-4 sm:px-7 sm:py-6">
              {!generatedKey ? (
                <>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium"><Gamepad2 className="h-4 w-4 text-muted-foreground" />{t("Game")} <span className="text-primary">*</span></label>
                    <GamePicker value={selectedGame} onChange={setSelectedGame} disabled={!canGenerate || isLoading} />
                    {selectedGame ? (
                      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
                        <p className="font-semibold text-amber-300">{t("This key will ONLY work in:")}</p>
                        <p className="mt-0.5 break-words text-sm font-bold text-foreground">{selectedGame.name}</p>
                        <p className="mt-1 text-muted-foreground">{t("Wrong game? Tap the box above to change it.")}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t("Your key will only work in the game you pick.")}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium"><User className="h-4 w-4 text-muted-foreground" />{t("Username (optional)")}</label>
                    <Input placeholder={t("Enter your Roblox username")} value={username} onChange={(e) => setUsername(e.target.value)} disabled={!canGenerate || isLoading} />
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <Button onClick={generateKey} disabled={!canGenerate || isLoading || !selectedGame} className="h-12 w-full text-[15px] font-bold">
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("Generating...")}</>
                    ) : !selectedGame ? (
                      <><Gamepad2 className="mr-2 h-4 w-4" /> {t("Select a game first")}</>
                    ) : adClicks < REQUIRED_AD_CLICKS ? (
                      <><Key className="mr-2 h-4 w-4" /> {t("Click Ad Button")} ({adClicks}/{REQUIRED_AD_CLICKS})</>
                    ) : (
                      <><Key className="mr-2 h-4 w-4" /> {t("Get My {n}-Hour Key").replace("{n}", String(pendingKeyHours))}</>
                    )}
                  </Button>
                  <button type="button" onClick={() => navigate("/extend-key")} className="mx-auto flex items-center gap-1.5 text-sm text-primary hover:underline">
                    <Clock className="h-4 w-4" /> {t("Already have a key? Add more hours")}
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-primary/40 bg-black/60 p-4 text-center sm:p-5">
                    <pre className="select-all whitespace-pre-wrap break-all font-mono text-sm leading-relaxed tracking-wider text-[#f3e6c8] sm:text-lg">{generatedKey}</pre>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button onClick={() => copyToClipboard(generatedKey)} className="h-11 font-bold"><Copy className="mr-2 h-4 w-4" /> {t("Copy Key")}</Button>
                    <a href="/scripts" className="flex h-11 items-center justify-center gap-2 rounded-md border border-primary/40 text-sm font-semibold hover:bg-primary/10"><Code2 className="h-4 w-4" /> {t("Get Script")}</a>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {keyGameName && <div className={fact}><span className="block text-[11px] text-muted-foreground">{t("Works in")}</span><b className="break-words text-sm sm:text-base">{keyGameName}</b></div>}
                    {keyLeft && <div className={fact}><span className="block text-[11px] text-muted-foreground">{t("Time left")}</span><b className="text-sm text-green-400 sm:text-base">{keyLeft}</b></div>}
                    <div className={`${fact} ${keyGameName && keyLeft ? "col-span-2 sm:col-span-1" : ""}`}><span className="block text-[11px] text-muted-foreground">{t("Device")}</span><b className="text-sm sm:text-base">{t("This device only")}</b></div>
                  </div>
                  <div className="text-sm text-foreground/85">
                    <p className="font-semibold">{t("How to use it")}</p>
                    <ol className="mt-1.5 list-decimal space-y-1 pl-5">
                      <li>{t("Run the COMBO_WICK script in Roblox")}</li>
                      <li>{t("Paste this key when it asks")}</li>
                      <li>{t("Done. It stays on this device until it runs out.")}</li>
                    </ol>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    <button type="button" onClick={startNewKey} className="text-primary hover:underline">{t("Need a key for another game?")}</button>
                    <button type="button" onClick={() => navigate("/extend-key")} className="text-primary hover:underline">{t("Already have a key? Add more hours")}</button>
                  </div>
                  {weekN > 0 && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-bold">🔥 {t("Key #{n} this week").replace("{n}", String(weekN))}</p>
                        <p className="text-xs text-muted-foreground">{t("7 days in a row = 20% off Premium")}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1" aria-hidden>
                        {keyDays.map((on, i) => (
                          <span key={i} className={`h-2.5 w-2.5 rounded-full ${on ? "bg-primary" : "bg-white/15"} ${i === 6 ? "ring-1 ring-primary/70 ring-offset-1 ring-offset-black" : ""}`} />
                        ))}
                      </div>
                    </div>
                  )}
                  <PremiumGlowBar
                    title={weekN >= 3 ? t("Key #{n} this week. Done with Linkvertise?").replace("{n}", String(weekN)) : t("Done with Linkvertise and the 1-hour wait?")}
                    sub={t("Premium: no Linkvertise, no 1-hour wait, every game")}
                  />
                </>
              )}
            </div>
          </VerifyCard>

          {/* Device troubleshooting — key valid but "Invalid Key" on their device */}
          <Link
            to="/fix-key"
            className="mx-auto flex w-full max-w-3xl items-center justify-center gap-2 rounded-lg border border-border/60 bg-secondary/30 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary hover:border-primary/40"
          >
            <Shield className="h-3.5 w-3.5" />
            {t("Getting \"Invalid Key\" on your device? Fix it here")}
          </Link>
        </div>
      </main>
      <BugReportWidget page="access-key" game={selectedGame?.name} />
    </div>
  );
}
