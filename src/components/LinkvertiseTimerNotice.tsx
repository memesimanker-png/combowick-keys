import { Clock, ExternalLink } from "lucide-react";

/**
 * Disclaimer about Linkvertise's ad timer (the 3rd step / "1-hour" wait)
 * which is set by Linkvertise, NOT us. Reduces support tickets / Discord rage.
 */
export function LinkvertiseTimerNotice() {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed">
      <div className="flex items-start gap-2">
        <Clock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            Heads up — the wait timer is set by Linkvertise, not us.
          </p>
          <p className="text-muted-foreground">
            Linkvertise (the ad service) controls the countdown on each step (sometimes up to ~1 hour on the
            final one). We can't shorten or remove it. If you want to skip ads entirely, grab a{" "}
            <a href="/premium-keys" className="text-primary underline-offset-2 hover:underline inline-flex items-center gap-0.5">
              Premium Key <ExternalLink className="h-3 w-3" />
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
