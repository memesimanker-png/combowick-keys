import { useEffect, useRef, useState } from "react";
import { Lock, Loader2, Unlock } from "lucide-react";
import { CpaGate } from "@/components/CpaGate";
import { useTranslation } from "@/lib/translation-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { buildLinkvertiseUrl } from "@/lib/linkvertise";
import { useVerifyLinks } from "@/hooks/useVerifyLinks";

const UNLOCK_TTL_MS = 24 * 60 * 60 * 1000;
const storageKey = (slug: string) => `script_unlock_${slug}`;

const UNLOCK_EVENT = "cw-script-unlocked";

export function useScriptUnlocked(slug: string | undefined) {
  const [unlocked, setUnlocked] = useState(false);
  const [tick, setTick] = useState(0);

  // The offer-wall unlock happens on this page (no redirect), so re-check when it fires.
  useEffect(() => {
    const on = () => setTick((n) => n + 1);
    window.addEventListener(UNLOCK_EVENT, on);
    return () => window.removeEventListener(UNLOCK_EVENT, on);
  }, []);

  useEffect(() => {
    if (!slug) { setUnlocked(false); return; }
    const raw = localStorage.getItem(storageKey(slug));
    if (raw) {
      const ts = Number(raw);
      if (Date.now() - ts < UNLOCK_TTL_MS) {
        setUnlocked(true);
        return;
      }
      localStorage.removeItem(storageKey(slug));
    }
    // Not unlocked for THIS slug — reset (fixes leak where unlocking one script
    // left `unlocked` true when SPA-navigating to a different, still-locked script).
    setUnlocked(false);
  }, [slug, tick]);

  return unlocked;
}

function makeNonce(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface Props {
  slug: string;
  title: string;
  thumbnail?: string | null;
}

export function ScriptUnlockGate({ slug }: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const links = useVerifyLinks();
  // Arriving from /unlock (YouTube smart links) opens the offer wall straight away.
  const [open, setOpen] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("unlock") === "1"; } catch { return false; }
  });

  const boxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => boxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
    return () => window.clearTimeout(id);
  }, [open]);

  // Old path, only used when Linkvertise is switched on AND the visitor has no offers.
  const handleUnlock = () => {
    setLoading(true);
    try {
      const origin = window.location.origin;
      const nonce = makeNonce();
      localStorage.setItem(
        "script_unlock_pending",
        JSON.stringify({ slug, nonce, ts: Date.now() })
      );
      const destination = `${origin}/ad-return/script-step2?slug=${encodeURIComponent(slug)}&hash=${nonce}`;
      window.location.href = buildLinkvertiseUrl(links[0], destination);
    } catch (e: any) {
      toast({ title: "Unlock failed", description: e?.message || "Try again", variant: "destructive" });
      setLoading(false);
    }
  };

  // Any real CPALead payment for this visitor unlocks the loadstring on this device for 24h.
  const unlockScript = async () => {
    localStorage.setItem(storageKey(slug), String(Date.now()));
    return true;
  };

  return (
    <div ref={boxRef} className="scroll-mt-20 rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-5 sm:p-8 text-center">
      <Lock className="h-10 w-10 text-primary mx-auto mb-3" />
      <p className="text-lg font-semibold mb-2">{t("Unlock Script Code")}</p>
      <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
        {t("Complete 1 quick offer to reveal the script. Unlock lasts 24 hours on this device.")}
      </p>
      {open ? (
        <div className="text-left">
          <CpaGate
            onConfirm={unlockScript}
            onDone={() => window.dispatchEvent(new Event(UNLOCK_EVENT))}
            doneTitle={`${t("Script unlocked!")} ✅`}
            doneText={t("Your loadstring is ready below.")}
            lvFallback={() => { if (!loading) handleUnlock(); }}
          />
        </div>
      ) : (
        <Button onClick={() => setOpen(true)} disabled={loading} size="lg" className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
          {loading ? t("Loading...") : t("Unlock Script")}
        </Button>
      )}
    </div>
  );
}

export { UNLOCK_TTL_MS };
