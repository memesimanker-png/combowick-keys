import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, User, Clock, Shield, Key, Loader2, Code2, ExternalLink } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/lib/translation-context";
import { FunnelHeader } from "@/components/FunnelHeader";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { NoIndex } from "@/components/NoIndex";
import { SkipAdsBanner } from "@/components/SkipAdsBanner";
import { SkipAdsFloatButton } from "@/components/SkipAdsFloatButton";
import { usePopunder } from "@/hooks/usePopunder";
import { useAdSettings } from "@/hooks/useAdSettings";
import ScriptPromoPopup from "@/components/ScriptPromoPopup";



interface StoredKeyData {
  key: string;
  expires_at: string;
  username?: string;
  generated_at: number;
}

export default function AccessKey() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [keyExpiresAt, setKeyExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [canGenerate, setCanGenerate] = useState(true);
  const [error, setError] = useState("");
  const [adClicks, setAdClicks] = useState(0);

  const [requiredClicks, setRequiredClicks] = useState(2);

  const { isAdEnabled } = useAdSettings();
  usePopunder(true); // popunder always on for the key-generation page
  const directLinkEnabled = isAdEnabled("access-key", "direct_link");
  const REQUIRED_AD_CLICKS = directLinkEnabled ? requiredClicks : 0;

  const DIRECT_LINK_URL = "https://omg10.com/4/11703894";

  // Verify steps are completed & load stored key
  useEffect(() => {
    const step3Done = localStorage.getItem("step3_completed");
    if (!step3Done) {
      toast({ variant: "destructive", title: "Access Denied", description: "Please complete all verification steps." });
      navigate("/verify/provider-select");
      return;
    }

    supabase
      .from("verify_settings")
      .select("access_key_clicks")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.access_key_clicks != null) setRequiredClicks(data.access_key_clicks);
      });

    loadStoredKeyData();
    checkExistingKey();
  }, [navigate, toast]);

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
    if (directLinkEnabled && adClicks < REQUIRED_AD_CLICKS) {
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

    if (!verifyToken) {
      setError("Your verification expired. Please verify again.");
      toast({ variant: "destructive", title: "Verification required", description: "Please complete the verification steps again." });
      setIsLoading(false);
      navigate("/verify/provider-select");
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-hwid-key", {
        body: { username: username.trim() || undefined, verify_token: verifyToken },
      });

      // Extract real server error message (supabase wraps non-2xx in FunctionsHttpError)
      let serverErr = "";
      if (fnError) {
        try {
          const ctx = (fnError as any)?.context;
          if (ctx && typeof ctx.json === "function") {
            const j = await ctx.json();
            serverErr = j?.error || j?.message || "";
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
        };

        localStorage.setItem("hwid_key_data", JSON.stringify(keyData));
        setGeneratedKey(data.key);
        setKeyExpiresAt(expiryDate.toISOString());
        setCanGenerate(false);

        toast({ title: "Key Generated!", description: `Your ${data.hours || 11}-hour HWID key has been generated.` });
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

  const formatTimeRemaining = () => {
    if (!keyExpiresAt) return "";
    const remaining = new Date(keyExpiresAt).getTime() - Date.now();
    if (remaining <= 0) return "Expired";
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-black/70 flex flex-col">
      <NoIndex />
      <ScriptPromoPopup enabled={isAdEnabled("access-key", "script_promo")} />
      {isAdEnabled("access-key", "skip_ads_banner") && <SkipAdsBanner />}
      <FunnelHeader title="COMBO WICK" />

      <main className="flex-1 container flex flex-col items-center justify-center py-12">
        <div className="max-w-md w-full mx-auto space-y-6">
          <div className="text-center space-y-2">
            <Key className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-3xl font-bold">Access Key Generator</h1>
            <p className="text-muted-foreground">Generate your HWID access key below.</p>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/extend-key")}>
              <Clock className="h-4 w-4" /> Already have a key? Add more hours
            </Button>
          </div>

          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle>Generate Your Key</CardTitle>
              <CardDescription>Enter a username (optional) and generate your 11-hour HWID key.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium">Username (optional)</label>
                </div>
                <Input
                  placeholder="Enter your Roblox username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!canGenerate || isLoading}
                />
              </div>

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              {generatedKey ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-black/50 p-4 border border-green-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-green-400 font-medium">Your HWID Key:</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(generatedKey)}
                        className="h-7 text-green-400 hover:text-green-300"
                      >
                        <Copy className="h-3 w-3 mr-1" /> Copy
                      </Button>
                    </div>
                    <pre className="text-xs font-mono text-green-400 break-all whitespace-pre-wrap select-all leading-relaxed">
                      {generatedKey}
                    </pre>
                  </div>
                  {keyExpiresAt && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Display expires in: {formatTimeRemaining()}</span>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  onClick={generateKey}
                  disabled={!canGenerate || isLoading}
                  className="w-full bg-gradient-to-r from-primary to-purple-500 hover:shadow-lg transition-all"
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : adClicks < REQUIRED_AD_CLICKS ? (
                    <><Key className="mr-2 h-4 w-4" /> Continue (Step {adClicks + 1} of {REQUIRED_AD_CLICKS + 1})</>
                  ) : (
                    <><Key className="mr-2 h-4 w-4" /> Generate HWID Key</>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Where to grab the actual script once they have a key */}
          <a
            href="http://combowick.com/scripts"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <Code2 className="h-4 w-4" />
            {t("Get Script")}
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
        </div>
      </main>
      {isAdEnabled("access-key", "skip_ads_float") && <SkipAdsFloatButton />}
    </div>
  );
}
