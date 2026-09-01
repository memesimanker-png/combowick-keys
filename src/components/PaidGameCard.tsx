import { Check, AlertTriangle, RefreshCw, Shield, Play, History, Flame, Zap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "@/lib/translation-context";

export interface PaidPricingTier {
  price: number;
  label: string;
  period: "month" | "lifetime";
  description?: string;
  note?: string;
}

export interface ChangelogEntry {
  id: string | number;
  version: string;
  changes: string;
  created_at: string;
}

interface PaidGameCardProps {
  game: string;
  title: string;
  subtitle?: string;
  thumbnail: string;
  badge?: { text: string; variant: "green" | "amber" | "red" | "primary" };
  features: string[];
  warning?: string;
  videoUrl?: string;
  changelog?: ChangelogEntry[];
  pricing: PaidPricingTier[];
  paused?: boolean;
  pauseMessage?: string | null;
  onSelectPlan: (plan: PaidPricingTier) => void;
}

const badgeStyles: Record<string, string> = {
  green: "bg-green-500/20 text-green-300 border-green-500/30",
  amber: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  red: "bg-red-500/20 text-red-300 border-red-500/30",
  primary: "bg-primary/20 text-primary border-primary/30",
};

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([^?&/]+)/);
  return m ? m[1] : null;
}

export function PaidGameCard({
  game, title, subtitle, thumbnail, badge, features, warning,
  videoUrl, changelog, pricing, paused, pauseMessage, onSelectPlan,
}: PaidGameCardProps) {
  const { t } = useTranslation();
  const [showVideo, setShowVideo] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  const lifetimePlan = pricing.find(p => p.period === "lifetime");
  const monthlyPlan = pricing.find(p => p.period === "month");
  const hasBoth = !!lifetimePlan && !!monthlyPlan;
  const monthlySavings = hasBoth
    ? Math.round(((monthlyPlan!.price * 12 - lifetimePlan!.price) / (monthlyPlan!.price * 12)) * 100)
    : 0;

  const ytId = videoUrl ? extractYouTubeId(videoUrl) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="card-neon rounded-lg bg-card border-yellow-500/20 overflow-hidden flex flex-col"
    >
      <div className="relative aspect-video">
        <img
          src={thumbnail}
          alt={game}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          width={640}
          height={360}
        />
        {badge && (
          <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full border ${badgeStyles[badge.variant]}`}>
            {t(badge.text)}
          </span>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <p className="text-xs text-muted-foreground mb-1">{game}</p>
        <h3 className="font-heading font-bold text-lg mb-1">{t(title)}</h3>
        {subtitle && <p className="text-primary text-xs font-medium mb-3">{t(subtitle)}</p>}

        {videoUrl && (
          <div className="mb-4">
            {showVideo && ytId ? (
              <div className="aspect-video rounded-md overflow-hidden border border-border">
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Preview video"
                />
              </div>
            ) : (
              <button
                onClick={() => setShowVideo(true)}
                className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 border border-border rounded-md py-2 text-sm transition-colors"
              >
                <Play className="w-4 h-4 text-primary" /> {t("Watch Preview")}
              </button>
            )}
          </div>
        )}

        <ul className="space-y-1.5 mb-4 flex-1">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              <span>{t(f)}</span>
            </li>
          ))}
        </ul>

        {changelog && changelog.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowChangelog(!showChangelog)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-2"
            >
              <History className="w-3.5 h-3.5" />
              {showChangelog ? t("Hide") : t("View")} {t("changelog")} ({changelog.length})
            </button>
            {showChangelog && (
              <div className="space-y-1.5 pl-1 border-l-2 border-primary/20 ml-1">
                {changelog.map((log) => (
                  <div key={log.id} className="pl-3 py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-primary">{log.version}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary-foreground leading-tight">{t(log.changes)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {warning && (
          <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-3 py-2 mb-4 text-xs text-yellow-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {t(warning)}
          </div>
        )}

        {paused ? (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-center mb-2">
            <p className="text-sm font-semibold text-yellow-300 mb-1">{t("Purchases Paused")}</p>
            <p className="text-xs text-muted-foreground">
              {pauseMessage ? t(pauseMessage) : t("This script is being updated. Please check back later.")}
            </p>
          </div>
        ) : (
        <div className="flex gap-3 mb-2">
          {pricing.map((tier) => {
            const isLifetime = tier.period === "lifetime";
            const isBestValue = isLifetime && hasBoth;
            return (
              <button
                key={tier.label}
                onClick={() => onSelectPlan(tier)}
                className={`group relative flex-1 rounded-lg p-3 text-center transition-all border ${
                  isBestValue
                    ? "bg-primary/5 border-primary/40 hover:border-primary"
                    : "bg-secondary hover:bg-secondary/80 border-border hover:border-primary/30"
                }`}
              >
                {isBestValue && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    <Flame className="w-2.5 h-2.5" />
                    {t("Best Value")}
                  </div>
                )}
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  {isLifetime ? <Shield className="w-3.5 h-3.5 text-primary" /> : <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />}
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{tier.label}</span>
                </div>
                <div className="text-2xl font-heading font-bold">${tier.price}</div>
                <div className="text-[10px] text-muted-foreground mb-1">/{tier.period === "month" ? "mo" : "lifetime"}</div>
                {isBestValue && monthlySavings > 0 && (
                  <div className="text-[9px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5 inline-block">
                    {t("Save")} {monthlySavings}% vs {t("monthly")}
                  </div>
                )}
                <div className={`mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-md py-1.5 ${
                  isBestValue
                    ? "bg-primary text-primary-foreground group-hover:bg-primary/90"
                    : "bg-secondary-foreground/10 text-secondary-foreground group-hover:bg-secondary-foreground/20"
                }`}>
                  {t("Get Access")}
                  <ArrowRight className="w-3 h-3" />
                </div>
                {tier.note && (
                  <p className="mt-2 text-[9px] leading-tight text-muted-foreground">{t(tier.note)}</p>
                )}
              </button>
            );
          })}
        </div>
        )}

        <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-border text-[10px] text-muted-foreground">
          <Zap className="w-3 h-3 text-primary" />
          {t("Instant key delivery after payment")}
        </div>
      </div>
    </motion.div>
  );
}
