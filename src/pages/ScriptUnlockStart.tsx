import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shield, Loader2, Unlock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NoIndex } from "@/components/NoIndex";
import { buildLinkvertiseUrl } from "@/lib/linkvertise";
import { useVerifyLinks } from "@/hooks/useVerifyLinks";

/**
 * External entry point for the script unlock (e.g. arrived from the YouTube smart-link gate).
 * Sets the same-origin anti-bypass nonce, then fires ONE Linkvertise step that returns to
 * /ad-return/script — which validates referrer + nonce and unlocks the loadstring on /scripts/:slug.
 * The nonce must be written here (store origin) because localStorage is per-domain.
 */
function makeNonce(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function ScriptUnlockStart() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const links = useVerifyLinks();
  const [error, setError] = useState<string | null>(null);
  const fired = useRef(false);
  const slug = params.get("slug");

  const launch = () => {
    if (!slug) { navigate("/scripts", { replace: true }); return; }
    try {
      const origin = window.location.origin;
      const nonce = makeNonce();
      localStorage.setItem("script_unlock_pending", JSON.stringify({ slug, nonce, ts: Date.now() }));
      const destination = `${origin}/ad-return/script?slug=${encodeURIComponent(slug)}&hash=${nonce}`;
      window.location.href = buildLinkvertiseUrl(links[0], destination);
    } catch (e: any) {
      setError(e?.message || "Could not start unlock. Try again.");
    }
  };

  // Auto-fire once the Linkvertise link config has loaded (same-tab nav — not popup-blocked).
  useEffect(() => {
    if (fired.current) return;
    if (!slug) { navigate("/scripts", { replace: true }); return; }
    if (links.every((l) => l === null)) return; // wait for config
    fired.current = true;
    const t = setTimeout(launch, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links, slug]);

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
            <CardTitle>Unlock Your Script</CardTitle>
            <CardDescription>One quick step to reveal the loadstring.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              {error ? (
                <>
                  <p className="text-center text-sm text-red-400">{error}</p>
                  <Button onClick={launch} className="gap-2"><Unlock className="h-4 w-4" /> Try again</Button>
                </>
              ) : (
                <>
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <p className="text-center text-muted-foreground">Preparing your unlock…</p>
                  <Button variant="outline" onClick={launch} className="gap-2">
                    <Unlock className="h-4 w-4" /> Continue
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
