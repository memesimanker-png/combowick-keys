import { useState } from "react";
import { KeyRound, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { FunnelHeader } from "@/components/FunnelHeader";
import { NoIndex } from "@/components/NoIndex";
import { RobloxUserField } from "@/components/RobloxUserField";
import { useTranslation } from "@/lib/translation-context";

const SELF_SKIP = "https://v0-remix-of-roblox-executor-system.vercel.app/api/self-skip";

export default function FixKey() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [key, setKey] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!key.trim()) { toast({ variant: "destructive", title: t("Enter your key first.") }); return; }
    if (!/^\d{2,20}$/.test(userId.trim())) { toast({ variant: "destructive", title: t("Enter a valid Roblox UserId (numbers only).") }); return; }
    setLoading(true);
    try {
      const res = await fetch(SELF_SKIP, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: key.trim(), user_id: userId.trim() }) });
      const data = await res.json().catch(() => ({ success: false }));
      if (data?.success) {
        setDone(true);
        toast({ title: t("Device whitelisted!"), description: t("Re-run the script — it'll work now.") });
      } else {
        toast({ variant: "destructive", title: t("Couldn't fix it"), description: data?.error || t("Please try again.") });
      }
    } catch {
      toast({ variant: "destructive", title: t("Network error"), description: t("Please try again.") });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-black/70 flex flex-col">
      <NoIndex />
      <FunnelHeader title="COMBO WICK" />
      <main className="flex-1 container flex flex-col items-center justify-center py-12">
        <div className="max-w-md w-full mx-auto space-y-6">
          <div className="text-center space-y-2">
            <ShieldCheck className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-3xl font-bold">{t("Fix Your Key")}</h1>
            <p className="text-muted-foreground">{t("Getting \"Invalid Key\" on your device even though your key is valid? Whitelist your device here.")}</p>
          </div>

          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle>{t("Whitelist Your Device")}</CardTitle>
              <CardDescription>{t("This fixes the rare case where your device reports a bad HWID. Your key must be valid and active.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {done ? (
                <div className="py-6 text-center space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto" />
                  <p className="text-sm font-medium">{t("Done! Re-run the script and it'll work — until your key expires.")}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-muted-foreground" /><label className="text-sm font-medium">{t("Your Key")}</label></div>
                    <Input placeholder={t("Paste your key")} value={key} onChange={(e) => setKey(e.target.value)} disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("Your Roblox Account")}</label>
                    <RobloxUserField value={userId} onChange={setUserId} disabled={loading} />
                  </div>
                  <Button onClick={submit} disabled={loading} className="w-full bg-gradient-to-r from-primary to-purple-500 hover:shadow-lg transition-all">
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("Whitelisting…")}</> : <>{t("Whitelist My Device")}</>}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
          <p className="text-center text-xs text-muted-foreground">{t("Still stuck? Contact support on Discord with your key + UserId.")}</p>
        </div>
      </main>
    </div>
  );
}
