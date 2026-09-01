import { Link } from "react-router-dom";
import { ShieldCheck, DollarSign, Calendar } from "lucide-react";
import { type Script } from "@/lib/scripts-data";
import { GameThumbnail } from "@/components/GameThumbnail";

function formatDate(iso: string): string {
  if (!iso) return "Recently";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ScriptCard({ script }: { script: Script }) {
  const dateIso = script.updatedAt || script.createdAt;
  return (
    <article className="group relative flex flex-col rounded-lg border border-border bg-card hover:border-primary/50 transition-all duration-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <GameThumbnail gameName={script.game} universeId={(script as any).game_universe_id} customUrl={(script as any).thumbnail_url} size="sm" />
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {script.game}
          </span>
          {script.is_paid && (
            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              <DollarSign className="h-3 w-3" />
              PAID
            </span>
          )}
          {script.trending && (
            <span className="font-mono text-[10px] tracking-wider text-bronze-light/70 uppercase">
              // active
            </span>
          )}
          {script.verified && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <ShieldCheck className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 pb-3">
        <Link to={script.is_paid ? "/premium-keys" : `/scripts/${script.slug}`}>
          <h2 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors">
            {script.title}
          </h2>
        </Link>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {script.description}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        {script.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{script.category}</span>
        <time dateTime={dateIso} className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Updated {formatDate(dateIso)}
        </time>
      </div>
    </article>
  );
}
