import { useEffect, useState } from "react";
import { Lock, Loader2, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { buildLinkvertiseUrl } from "@/lib/linkvertise";
import { useVerifyLinks } from "@/hooks/useVerifyLinks";

const UNLOCK_TTL_MS = 24 * 60 * 60 * 1000;
const storageKey = (slug: string) => `script_unlock_${slug}`;

export function useScriptUnlocked(slug: string | undefined) {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const raw = localStorage.getItem(storageKey(slug));
    if (raw) {
      const ts = Number(raw);
      if (Date.now() - ts < UNLOCK_TTL_MS) {
        setUnlocked(true);
        return;
      }
      localStorage.removeItem(storageKey(slug));
    }
  }, [slug]);

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
  const links = useVerifyLinks();

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

  return (
    <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-8 text-center">
      <Lock className="h-10 w-10 text-primary mx-auto mb-3" />
      <p className="text-lg font-semibold mb-2">Unlock Script Code</p>
      <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
        Complete two quick Linkvertise steps to reveal the script. Unlock lasts 24 hours on this device.
      </p>
      <Button onClick={handleUnlock} disabled={loading} size="lg" className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
        {loading ? "Opening link..." : "Unlock Script"}
      </Button>
    </div>
  );
}

export { UNLOCK_TTL_MS };
