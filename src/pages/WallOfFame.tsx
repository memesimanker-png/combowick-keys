import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Crown, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Member = {
  handle: string;
  tier: string;
  days: number;
};

// Anonymize an email or display name to a 2-letter monogram + masked tail.
function anonymize(email: string | null | undefined, idx: number): string {
  if (!email) return `Member · ${String(idx + 1).padStart(3, "0")}`;
  const local = email.split("@")[0] ?? "";
  if (local.length <= 2) return `${local.toUpperCase()}··`;
  return `${local.slice(0, 2).toUpperCase()}${"·".repeat(Math.min(local.length - 2, 6))}`;
}

function tierLabel(tier: string): string {
  const t = tier.toLowerCase();
  if (t.includes("life")) return "Lifetime";
  if (t.includes("month") || t.includes("30")) return "Monthly";
  if (t.includes("week") || t.includes("7")) return "Weekly";
  return tier;
}

export default function WallOfFame() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      // Limit shown loyalists — quiet display, not a leaderboard
      const { data, count } = await supabase
        .from("premium_key_purchases")
        .select("customer_email, tier, created_at, status", { count: "exact" })
        .eq("status", "completed")
        .order("created_at", { ascending: true })
        .limit(12);

      const now = Date.now();
      const list: Member[] = (data ?? []).map((row: any, i: number) => ({
        handle: anonymize(row.customer_email, i),
        tier: tierLabel(row.tier ?? ""),
        days: Math.max(1, Math.floor((now - new Date(row.created_at).getTime()) / 86400000)),
      }));
      setMembers(list);
      setTotalCount(count ?? list.length);
      setLoading(false);
    })();
  }, []);

  return (
    <Layout>
      <SEOHead
        title="Wall of Fame — ComboWick"
        description="Quiet recognition for those who stayed. Anonymous loyalty roll of ComboWick members."
      />

      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 star-field opacity-20" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="font-serif italic text-bronze-light/80 text-sm tracking-[0.3em] uppercase mb-4"
          >
            — Honor Those Who Stayed —
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight"
          >
            <span className="text-gradient-neon">Wall of Fame</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-serif italic text-base sm:text-lg text-bronze-light/80 max-w-xl mx-auto"
          >
            Fideliter. Silenter. Diu.
            <span className="block not-italic text-xs text-muted-foreground mt-2 tracking-wider">
              Faithfully. Quietly. For a long time.
            </span>
          </motion.p>
        </div>
      </section>

      <section className="relative pb-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 rounded-full border-2 border-bronze/30 border-t-bronze-light animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-center text-muted-foreground py-16 font-serif italic">
              The roll opens soon. Be among the first.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {members.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                  className="flex items-center gap-4 px-5 py-4 rounded-md border border-bronze/15 bg-card/40 backdrop-blur-sm hover:border-bronze/40 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-bronze/30 bg-bronze/5">
                    {m.tier === "Lifetime" ? (
                      <Crown className="h-4 w-4 text-bronze-light" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-bronze-light" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-sm tracking-widest text-ivory truncate">{m.handle}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
                      {m.tier} · {m.days}d
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {totalCount > members.length && (
            <p className="text-center mt-10 text-xs uppercase tracking-[0.3em] text-muted-foreground font-serif">
              … and {totalCount - members.length} more, unnamed.
            </p>
          )}

          <div className="mt-16 text-center border-t border-bronze/10 pt-12">
            <p className="font-serif italic text-bronze-light/80 mb-6 max-w-lg mx-auto">
              "The wise prince does not seek applause. He builds the wall, and lets time
              decide who remains beside him."
            </p>
            <Link to="/premium-keys">
              <Button size="lg" className="text-sm px-10 py-6 uppercase tracking-wider neon-glow">
                Take Your Place
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
