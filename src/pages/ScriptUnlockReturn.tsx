import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shield, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { NoIndex } from "@/components/NoIndex";

// Approved Linkvertise domains — referrer must come from one of these.
const APPROVED_DOMAINS = [
  "linkvertise.com", "link-to.net", "link-target.net", "link-center.net", "link-hub.net", "direct-link.net",
];

// Known link-bypass sites — always block.
const BLOCKED_DOMAINS = [
  "link-bypass.com", "thebypasser.com", "bypass.city", "adbypass.org", "freebypass.com", "linkvertise.net",
];

const UNLOCK_TTL_MS = 24 * 60 * 60 * 1000;
const NONCE_TTL_MS = 30 * 60 * 1000; // 30 min to complete

function extractDomain(url: string): string {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h.startsWith("www.") ? h.slice(4) : h;
  } catch {
    return "";
  }
}

const isApproved = (d: string) =>
  APPROVED_DOMAINS.some((a) => d === a || d.endsWith(`.${a}`));
const isBlocked = (d: string) =>
  BLOCKED_DOMAINS.some((b) => d === b || d.endsWith(`.${b}`));

export default function ScriptUnlockReturn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stage, setStage] = useState<"checking" | "ok">("checking");

  useEffect(() => {
    const slug = params.get("slug");
    const hash = params.get("hash");

    if (!slug || !hash) {
      navigate("/blocked?reason=missing_params&redirect=/scripts", { replace: true });
      return;
    }

    // Pending session set when user clicked Unlock (rotated through step2)
    const pendingRaw = localStorage.getItem("script_unlock_pending");
    let pending: { slug: string; nonce: string; ts: number } | null = null;
    try { pending = pendingRaw ? JSON.parse(pendingRaw) : null; } catch { /* noop */ }

    if (!pending || pending.slug !== slug || pending.nonce !== hash) {
      navigate(`/blocked?reason=suspicious_activity&redirect=/scripts/${slug}`, { replace: true });
      return;
    }

    if (Date.now() - pending.ts > NONCE_TTL_MS) {
      localStorage.removeItem("script_unlock_pending");
      navigate(`/blocked?reason=session_expired&redirect=/scripts/${slug}`, { replace: true });
      return;
    }

    const refDomain = extractDomain(document.referrer);
    if (isBlocked(refDomain)) {
      navigate(`/blocked?reason=suspicious_activity&redirect=/scripts/${slug}`, { replace: true });
      return;
    }
    if (!refDomain || !isApproved(refDomain)) {
      navigate(`/blocked?reason=suspicious_activity&redirect=/scripts/${slug}`, { replace: true });
      return;
    }

    // Mark as unlocked
    localStorage.setItem(`script_unlock_${slug}`, String(Date.now()));
    localStorage.removeItem("script_unlock_pending");
    setStage("ok");
    toast({ title: "Script Unlocked", description: "Redirecting…" });

    const t = window.setTimeout(() => {
      navigate(`/scripts/${slug}`, { replace: true });
    }, 1200);
    return () => window.clearTimeout(t);
  }, [params, navigate, toast]);

  return (
    <div className="min-h-screen bg-black/70 flex flex-col">
      <NoIndex />
      <header className="container py-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">ComboWick Verify</h1>
        </div>
      </header>
      <main className="flex-1 container flex flex-col items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Script Unlock</CardTitle>
            <CardDescription>Verifying your completion…</CardDescription>
          </CardHeader>
          <CardContent>
            {stage === "checking" ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
                <p className="mt-4 text-center text-muted-foreground">Validating referrer…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <p className="mt-4 text-center font-medium">Verified! Loading your script…</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export { UNLOCK_TTL_MS };
