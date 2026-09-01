import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

// Drops land Mon / Wed / Fri at 18:00 UTC.
// NOTE: Pure client-side computation. Zero edge-function calls — the timer
// runs in the browser via setInterval against a fixed schedule.
const DROP_DAYS = [1, 3, 5]; // Mon, Wed, Fri
const DROP_HOUR_UTC = 18;

function nextDrop(now = new Date()): Date {
  const d = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    DROP_HOUR_UTC, 0, 0, 0,
  ));
  for (let i = 0; i < 8; i++) {
    const candidate = new Date(d.getTime() + i * 86400000);
    if (DROP_DAYS.includes(candidate.getUTCDay()) && candidate.getTime() > now.getTime()) {
      return candidate;
    }
  }
  return d;
}

function fmt(ms: number): string {
  if (ms <= 0) return "Now";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m ${sec.toString().padStart(2, "0")}s`;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DropCadenceTicker() {
  const target = useMemo(() => nextDrop(), []);
  const [remaining, setRemaining] = useState(target.getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRemaining(target.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  const dayLabel = DAY_NAMES[target.getUTCDay()];

  return (
    <section className="relative border-y border-bronze/15 bg-background/60 backdrop-blur-sm">
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-bronze opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-bronze-light" />
            </span>
            <div className="flex flex-col">
              <span className="font-serif text-[10px] uppercase tracking-[0.35em] text-bronze-light/80">
                Drop Schedule
              </span>
              <span className="font-serif text-sm sm:text-base text-ivory">
                Mon · Wed · Fri — 18:00 UTC
              </span>
            </div>
          </div>

          <div className="hidden sm:block h-10 w-px bg-bronze/20" />

          <div className="flex flex-col items-center sm:items-end">
            <span className="font-serif text-[10px] uppercase tracking-[0.35em] text-bronze-light/80">
              Next Drop · {dayLabel}
            </span>
            <span className="font-mono text-lg sm:text-xl text-ivory tabular-nums tracking-wider">
              {fmt(remaining)}
            </span>
          </div>

          <div className="hidden md:block h-10 w-px bg-bronze/20" />

          <Link
            to="/scripts"
            className="font-serif text-xs uppercase tracking-[0.3em] text-bronze-light hover:text-ivory border border-bronze/30 hover:border-bronze px-5 py-2.5 rounded-sm transition-colors"
          >
            See the Codex →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
