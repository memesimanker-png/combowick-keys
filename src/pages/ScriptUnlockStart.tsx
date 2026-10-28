import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shield, Loader2, Unlock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NoIndex } from "@/components/NoIndex";
import { buildLinkvertiseUrl } from "@/lib/linkvertise";
import { useVerifyLinks } from "@/hooks/useVerifyLinks";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";

// YouTube visitors (?lv=1): one visible Continue tap opens a Monetag sponsor tab and starts the
// Linkvertise steps in the same click (owner 2026-10-28; this zone paid ~$7 CPM on the old yotuube gate).
// Tapped within SPONSOR_CAP_MS -> straight into the steps like before.
const SPONSOR_URL = "https://omg10.com/4/11035810";
const SPONSOR_AT = "unlock_sponsor_at";
const SPONSOR_CAP_MS = 10 * 60 * 1000;
const sponsorRecent = () => {
  try { const at = Number(localStorage.getItem(SPONSOR_AT)) || 0; return at > 0 && Date.now() - at < SPONSOR_CAP_MS; } catch { return false; }
};

/**
 * External entry point for the script unlock (e.g. arrived from the YouTube smart-link gate).
 * Sets the same-origin anti-bypass nonce, then fires the FIRST of TWO Linkvertise steps (routes through step 2) before returning to
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
  // ?lv=1 (our YouTube short links): skip the script page and go straight into the Linkvertise steps.
  const direct = params.get("lv") === "1";
  const [waited, setWaited] = useState(false);
  const { t } = useTranslation();
  const [needsTap] = useState(() => direct && !sponsorRecent());
  useEffect(() => {
    if (!direct) return;
    const t = setTimeout(() => setWaited(true), 1500); // don't wait forever for the admin Linkvertise links
    return () => clearTimeout(t);
  }, [direct]);

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
      const destination = `${origin}/ad-return/script-step2?slug=${encodeURIComponent(slug)}&hash=${nonce}`;
      window.location.href = buildLinkvertiseUrl(links[0], destination);
    } catch (e: any) {
      setError(e?.message || "Could not start unlock. Try again.");
    }
  };

  // Once the slug is resolved, open the script page with the offer wall already open (?unlock=1).
  // The gate there uses CPALead offers; Linkvertise only if switched on and the visitor has no offers.
  useEffect(() => {
    if (fired.current || resolving || !slug) return;
    if (direct) {
      if (needsTap) return; // waits for the Continue tap (sponsor tab + steps)
      if (links[0] === null && !waited) return; // wait for the admin link (or the 1.5 s timeout)
      fired.current = true;
      launch();
      return;
    }
    fired.current = true;
    navigate(`/scripts/${encodeURIComponent(slug)}?unlock=1`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, resolving, navigate, direct, links, waited, needsTap]);

  const continueWithSponsor = () => {
    try { localStorage.setItem(SPONSOR_AT, String(Date.now())); } catch { /* ignore */ }
    window.open(SPONSOR_URL, "_blank", "noopener,noreferrer");
    fired.current = true;
    launch();
  };

  if (needsTap && !error) {
    const ready = !resolving && !!slug;
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
          <Card className="w-full max-w-md border-primary/30">
            <CardHeader>
              <CardTitle>{t("Your script is ready")}</CardTitle>
              <CardDescription>{t("Tap Continue to start 2 quick steps. A sponsor page opens in a new tab.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={continueWithSponsor} disabled={!ready} size="lg" className="w-full gap-2">
                {ready ? <Unlock className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                {t("Continue")}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

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
            <CardTitle>Opening your script</CardTitle>
            <CardDescription>Taking you to the download page…</CardDescription>
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
