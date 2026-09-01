import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Plus, ThumbsUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DISCORD_URL = "https://discord.gg/combowick";

type Suggestion = {
  id: string;
  text: string;
  votes: number;
  voted: boolean;
};

const SEEDS: Record<string, string[]> = {
  "blox-fruits": ["Auto Farm Mastery", "Devil Fruit Sniper", "Raid Auto", "ESP (Chests + Players)", "Auto Stats"],
  "arsenal": ["Silent Aim", "Player ESP", "Hitbox Extender", "Auto-Shoot", "No Recoil"],
  "pet-simulator": ["Auto Farm Coins", "Auto Hatch Eggs", "Best-Area Teleport", "Auto Sell", "Pet Dupe (if possible)"],
};

export function FeatureVoteCTA({ slug, game }: { slug: string; game: string }) {
  const storageKey = `combowick:votes:${slug}`;
  const seed = useMemo(() => SEEDS[slug] ?? ["Auto Farm", "ESP", "Anti-AFK", "Teleport", "Kill Aura"], [slug]);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setItems(JSON.parse(raw));
        return;
      }
    } catch {}
    setItems(
      seed.map((text, i) => ({
        id: `seed-${i}`,
        text,
        votes: Math.floor(Math.random() * 40) + 8,
        voted: false,
      }))
    );
  }, [storageKey, seed]);

  useEffect(() => {
    if (items.length) {
      try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch {}
    }
  }, [items, storageKey]);

  const vote = (id: string) =>
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, voted: !it.voted, votes: it.voted ? it.votes - 1 : it.votes + 1 }
          : it
      )
    );

  const add = () => {
    const text = input.trim();
    if (!text || text.length > 60) return;
    if (items.some((i) => i.text.toLowerCase() === text.toLowerCase())) return;
    setItems((prev) => [...prev, { id: `u-${Date.now()}`, text, votes: 1, voted: true }]);
    setInput("");
  };

  const sorted = [...items].sort((a, b) => b.votes - a.votes);

  return (
    <div className="p-6 sm:p-8 rounded-xl bg-card/50 border border-bronze/30">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-bronze-light" />
        <span className="text-[10px] font-serif tracking-[0.3em] uppercase text-bronze-light">
          Community Roadmap
        </span>
      </div>
      <h3 className="font-heading text-xl sm:text-2xl font-bold mb-2 tracking-tight">
        Vote on what ships first in the {game} script
      </h3>
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        Local preview — your votes save in this browser. Confirmed counts live in Discord, where top-voted features ship in v1.
      </p>

      <ul className="space-y-2 mb-5">
        {sorted.map((it) => (
          <motion.li
            key={it.id}
            layout
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-background/40 border border-border/40 hover:border-bronze/40 transition-colors"
          >
            <span className="text-sm text-foreground/90 truncate">{it.text}</span>
            <button
              onClick={() => vote(it.id)}
              className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md border transition-colors ${
                it.voted
                  ? "bg-bronze/20 border-bronze/50 text-bronze-light"
                  : "border-border/50 text-muted-foreground hover:text-bronze-light hover:border-bronze/40"
              }`}
              aria-pressed={it.voted}
            >
              <ThumbsUp className="w-3 h-3" />
              {it.votes}
            </button>
          </motion.li>
        ))}
      </ul>

      <div className="flex gap-2 mb-5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Suggest a feature…"
          maxLength={60}
          className="bg-background/40 border-border/50 focus-visible:ring-bronze/40"
        />
        <Button
          type="button"
          onClick={add}
          variant="outline"
          className="border-bronze/40 hover:bg-bronze/10 hover:text-bronze-light"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
        <Button className="w-full sm:w-auto text-xs uppercase tracking-wider neon-glow">
          <MessageCircle className="mr-2 h-4 w-4" />
          Submit in Discord for Official Vote
        </Button>
      </a>
    </div>
  );
}
