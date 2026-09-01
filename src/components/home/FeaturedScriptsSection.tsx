import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, ShieldCheck } from "lucide-react";
import { useFeaturedScripts } from "@/hooks/useScripts";
import { GameThumbnail } from "@/components/GameThumbnail";

export function FeaturedScriptsSection() {
  const { data: scripts = [], isLoading } = useFeaturedScripts(6);

  return (
    <section className="relative py-16 sm:py-20 border-t border-border/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Featured Roblox Scripts
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
              Hand-picked free Lua scripts for the most popular Roblox games — verified, tested, and ready to copy. Updated regularly with the latest auto-farms, ESPs, and utility tools.
            </p>
          </div>
          <Link
            to="/scripts"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Browse all scripts <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-lg border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : scripts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scripts available yet — check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scripts.map((s, i) => (
              <motion.article
                key={s.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group flex flex-col rounded-lg border border-border bg-card hover:border-primary/50 transition-all overflow-hidden"
              >
                <Link
                  to={s.is_paid ? "/premium-keys" : `/scripts/${s.slug}`}
                  className="flex flex-col h-full p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <GameThumbnail gameName={s.game} universeId={(s as any).game_universe_id} size="sm" />
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 truncate max-w-[140px]">
                        {s.game}
                      </span>
                      {s.trending && (
                        <span className="flex items-center gap-1 text-[11px] text-primary">
                          <TrendingUp className="h-3 w-3" /> Trending
                        </span>
                      )}
                      {s.verified && <ShieldCheck className="h-3 w-3 text-green-400" aria-label="Verified" />}
                    </div>
                  </div>
                  <h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1">
                    {s.description}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      {s.category}
                    </span>
                    <span className="text-[11px] text-muted-foreground">Updated {s.updatedAt}</span>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
