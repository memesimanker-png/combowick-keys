import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MailX, CheckCircle2, AlertTriangle } from "lucide-react";
import { NoIndex } from "@/components/NoIndex";

type State = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
          headers: { apikey: SUPABASE_ANON },
        });
        const data = await r.json();
        if (!r.ok) { setState("invalid"); setErrorMsg(data?.error ?? ""); return; }
        if (data?.valid === true) setState("valid");
        else if (data?.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    if (error) { setState("error"); setErrorMsg(error.message); return; }
    if ((data as any)?.success) setState("done");
    else if ((data as any)?.reason === "already_unsubscribed") setState("already");
    else { setState("error"); setErrorMsg((data as any)?.error ?? "Something went wrong"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <NoIndex />
      <Card className="max-w-md w-full border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MailX className="h-5 w-5 text-primary" />
            <CardTitle>Unsubscribe</CardTitle>
          </div>
          <CardDescription>Stop receiving emails from Combo_WICK.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "loading" && (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Validating link…</div>
          )}
          {state === "valid" && (
            <>
              <p className="text-sm text-muted-foreground">Click below to confirm you want to unsubscribe.</p>
              <Button onClick={confirm} className="w-full">Confirm Unsubscribe</Button>
            </>
          )}
          {state === "submitting" && (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Processing…</div>
          )}
          {state === "done" && (
            <div className="flex items-start gap-2 text-green-500"><CheckCircle2 className="h-5 w-5 mt-0.5" /><span>You've been unsubscribed. Sorry to see you go.</span></div>
          )}
          {state === "already" && (
            <div className="flex items-start gap-2 text-muted-foreground"><CheckCircle2 className="h-5 w-5 mt-0.5" /><span>This email is already unsubscribed.</span></div>
          )}
          {(state === "invalid" || state === "error") && (
            <div className="flex items-start gap-2 text-destructive"><AlertTriangle className="h-5 w-5 mt-0.5" /><span>{errorMsg || "This unsubscribe link is invalid or expired."}</span></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
