import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { maybeFireDirectLink } from "@/lib/monetag";

export function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    // Background-tab Monetag hop (rate-capped to once per 3 min).
    // Fires BEFORE the await so the user gesture isn't lost.
    maybeFireDirectLink();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.97] ${className}`}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Copy Script
        </>
      )}
    </button>
  );
}
