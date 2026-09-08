import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shield, Loader2, Unlock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NoIndex } from "@/components/NoIndex";
import { buildLinkvertiseUrl } from "@/lib/linkvertise";
import { useVerifyLinks } from "@/hooks/useVerifyLinks";
import { supabase } from "@/integrations/supabase/client";

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
  const [slug, setSlug] = useState<string | null>(params.get("slug"));
  const [resolving, setResolving] = useState(!params.get("slug"));
  const fired = useRef(false);
  const universe = params.get("u"); // key-system universe id (from the YouTube game picker)

  // Resolve a universe id → this store's script slug (scripts carry game_universe_id).
  useEffect(() => {
    if (slug) { setResolving(false); return; }
    if (!universe) { navigate("/scripts", { replace: true }); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("scripts")
        .select("slug")
        .eq("game_universe_id", universe)
        .eq("is_paid", false)
        .limit(1)
        .maybeSingle();
      let resolvedSlug = data?.slug as string | undefined;
      // No page for this game yet → auto-create it (service-role edge function).
      if (!resolvedSlug) {
        try {
          const { data: fn } = await supabase.functions.invoke("ensure-script", {
            body: { universe, name: params.get("n") || "" },
          });
          resolvedSlug = (fn as any)?.slug || undefined;
        } catch { /* ignore */ }
      }
      if (!alive) return;
      if (resolvedSlug) { setSlug(resolvedSlug); setResolving(false); }
      else navigate("/scripts", { replace: true });
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universe, slug]);

  const launch = () => {
    if (!slug) return;
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

  // Auto-fire once slug is resolved AND the Linkvertise config has loaded (same-tab nav).
  useEffect(() => {
    if (fired.current || resolving || !slug) return;
    if (links.every((l) => l === null)) return; // wait for config
    fired.current = true;
    const t = setTimeout(launch, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links, slug, resolving]);

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
