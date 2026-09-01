import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Clock, Loader2, KeyRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { NoIndex } from "@/components/NoIndex";
import { buildLinkvertiseUrl } from "@/lib/linkvertise";
import { useVerifyLinks } from "@/hooks/useVerifyLinks";
import { getDeviceId } from "@/lib/device-id";

export default function ExtendKey() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const links = useVerifyLinks();
  const [key, setKey] = useState("");
  const [hours, setHours] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Prefill the key the user most recently generated on this device.
    try {
      const raw = localStorage.getItem("hwid_key_data");
      if (raw) {
        const parsed = JSON.parse(raw) as { key?: string };
        if (parsed?.key) setKey(parsed.key);
      }
    } catch { /* noop */ }

    supabase.from("verify_settings").select("extension_hours").eq("id", 1).maybeSingle()
      .then(({ data }) => { if ((data as any)?.extension_hours) setHours((data as any).extension_hours); });
  }, []);

  const handleStart = async () => {
    const cleanKey = key.trim();
    if (cleanKey.length < 4) {
      toast({ variant: "destructive", title: "Enter your key", description: "Paste the HWID key you want to extend." });
      return;
    }
    setLoading(true);
    const hwid = getDeviceId();
    try {
      const { data, error } = await supabase.functions.invoke("start-key-extension", {
        body: { key: cleanKey, hwid },
      });
      let serverErr = "";
      if (error) {
        try {
          const ctx = (error as any)?.context;
          if (ctx?.json) { const j = await ctx.json(); serverErr = j?.error || ""; }
        } catch { /* noop */ }
      }
      if (!serverErr && data?.success === false) serverErr = data.error || "";
      if (error || data?.success === false) {
        toast({ variant: "destructive", title: "Cannot start", description: serverErr || "Try again." });
        setLoading(false);
        return;
      }

      // Store the pending extension for the return trip (token + hwid + key).
      localStorage.setItem("ext_pending", JSON.stringify({
        token: data.token, hwid, key: cleanKey, step: 1, ts: Date.now(),
      }));

      const returnUrl = `${window.location.origin}/ad-return/ext/step1`;
      window.location.href = buildLinkvertiseUrl(links[0], returnUrl);
    } catch {
      toast({ variant: "destructive", title: "Network error", description: "Please try again." });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black/70 flex flex-col">
      <NoIndex />
      <header className="container py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">COMBO WICK</h1>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="flex-1 container flex flex-col items-center justify-center py-12">
        <div className="max-w-md w-full mx-auto space-y-6">
          <div className="text-center space-y-2">
            <Clock className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-3xl font-bold">Add More Hours</h1>
            <p className="text-muted-foreground">
              Complete the 3 Linkvertise steps to add{hours ? ` +${hours}` : ""} hours on top of your key's remaining time.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> Your HWID Key</CardTitle>
              <CardDescription>The hours stack on your existing key — nothing is reset.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="paste your key e.g. abc123-def456..." className="font-mono" />
              <Button onClick={handleStart} disabled={loading} className="w-full gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {loading ? "Starting..." : `Extend Key (+${hours ?? 11}h)`}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => navigate("/access-key")}>
                Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
