import { useState } from "react";
import { KeyRound, Loader2, CheckCircle2, ShieldCheck, XCircle, ShieldQuestion } from "lucide-react";
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
  const [checking, setChecking] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{ valid: boolean; msg: string } | null>(null);

  const checkKey = async () => {
    if (!key.trim()) { toast({ variant: "destructive", title: t("Enter your key first.") }); return; }
    setChecking(true); setKeyStatus(null);
    try {
      const res = await fetch(SELF_SKIP, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: key.trim(), check: true }) });
      const data = await res.json().catch(() => ({}));
      if (data?.valid) {
        const exp = data.expires_at ? new Date(data.expires_at) : null;
        const days = exp ? Math.max(0, Math.ceil((exp.getTime() - Date.now()) / 86400000)) : null;
        setKeyStatus({ valid: true, msg: days != null ? t("Valid key — expires in {n} day(s)").replace("{n}", String(days)) : t("Valid key") });
      } else {
        const reasonMap: Record<string, string> = {
          not_found: t("Key not found — double-check it."),
          expired: t("This key has expired."),
          inactive: t("This key is inactive."),
          not_hwid: t("That isn't an HWID key."),
        };
        setKeyStatus({ valid: false, msg: reasonMap[data?.reason] || t("This key isn't valid.") });
      }
    } catch {
      toast({ variant: "destructive", title: t("Network error"), description: t("Please try again.") });
    } finally { setChecking(false); }
  };

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
                    <div className="flex gap-2">
                      <Input placeholder={t("Paste your key")} value={key} onChange={(e) => { setKey(e.target.value); setKeyStatus(null); }} disabled={loading} />
                      <Button type="button" variant="outline" onClick={checkKey} disabled={loading || checking || !key.trim()} className="shrink-0 gap-1.5">
                        {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldQuestion className="h-4 w-4" />} {t("Check")}
                      </Button>
                    </div>
                    {keyStatus && (
                      <p className={`text-xs flex items-center gap-1.5 ${keyStatus.valid ? "text-green-400" : "text-destructive"}`}>
                        {keyStatus.valid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {keyStatus.msg}
                      </p>
                    )}
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
