import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shield, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { NoIndex } from "@/components/NoIndex";
import { buildLinkvertiseUrl } from "@/lib/linkvertise";
import { useVerifyLinks } from "@/hooks/useVerifyLinks";

const APPROVED_DOMAINS = [
  "linkvertise.com", "link-to.net", "link-target.net", "link-center.net", "link-hub.net", "direct-link.net",
];
const BLOCKED_DOMAINS = [
  "link-bypass.com", "thebypasser.com", "bypass.city", "adbypass.org", "freebypass.com", "linkvertise.net",
];
const NONCE_TTL_MS = 30 * 60 * 1000;

function extractDomain(url: string): string {
  try { const h = new URL(url).hostname.toLowerCase(); return h.startsWith("www.") ? h.slice(4) : h; } catch { return ""; }
}
const isApproved = (d: string) => APPROVED_DOMAINS.some((a) => d === a || d.endsWith(`.${a}`));
const isBlocked = (d: string) => BLOCKED_DOMAINS.some((b) => d === b || d.endsWith(`.${b}`));

function makeNonce(): string {
  const arr = new Uint8Array(16); crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function ScriptUnlockStep2() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const links = useVerifyLinks();
  const [msg, setMsg] = useState("Validating step 1…");
  const [ran, setRan] = useState(false);

  useEffect(() => {
    if (links.every((l) => l === null) || ran) return;
    setRan(true);

    const slug = params.get("slug");
    const hash = params.get("hash");

    if (!slug || !hash) {
      navigate("/blocked?reason=missing_params&redirect=/scripts", { replace: true });
      return;
    }

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
    if (isBlocked(refDomain) || !refDomain || !isApproved(refDomain)) {
      navigate(`/blocked?reason=suspicious_activity&redirect=/scripts/${slug}`, { replace: true });
      return;
    }

    // Rotate nonce, write step2 pending, then send through the 2nd Linkvertise link.
    const nonce2 = makeNonce();
    localStorage.setItem("script_unlock_pending", JSON.stringify({ slug, nonce: nonce2, ts: Date.now() }));
    setMsg("Redirecting to step 2…");
    toast({ title: "Step 1 complete", description: "Redirecting to step 2…" });
    const destination = `${window.location.origin}/ad-return/script?slug=${encodeURIComponent(slug)}&hash=${nonce2}`;
    setTimeout(() => { window.location.href = buildLinkvertiseUrl(links[1], destination); }, 600);
  }, [links, ran, params, navigate, toast]);

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
            <CardTitle>Step 1 of 2 Complete</CardTitle>
            <CardDescription>Preparing final unlock…</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="mt-4 text-center text-muted-foreground">{msg}</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
