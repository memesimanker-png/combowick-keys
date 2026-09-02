import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Gamepad2, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useGamesList, type GameItem } from "@/hooks/useGamesList";
import { fetchGameThumbnailByUniverseId } from "@/lib/roblox-thumbnails";

function GameThumb({ game, size = 32 }: { game: GameItem; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (game.universe_id) {
      fetchGameThumbnailByUniverseId(Number(game.universe_id)).then((u) => {
        if (alive) setUrl(u);
      });
    }
    return () => {
      alive = false;
    };
  }, [game.universe_id]);
  return (
    <div
      className="shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <Gamepad2 className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}

export function GamePicker({
  value,
  onChange,
  disabled,
}: {
  value: GameItem | null;
  onChange: (g: GameItem) => void;
  disabled?: boolean;
}) {
  const { games, loading } = useGamesList();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? games.filter((g) => g.name.toLowerCase().includes(s)) : games;
    return list.slice(0, 60);
  }, [games, q]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {value ? (
          <>
            <GameThumb game={value} />
            <span className="min-w-0 flex-1 truncate">{value.name}</span>
          </>
        ) : (
          <>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <Gamepad2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {loading ? "Loading games…" : "Select a game"}
            </span>
          </>
        )}
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search games…"
              className="h-8 border-0 bg-transparent px-0 focus-visible:ring-0"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading games…
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">No games found.</div>
            ) : (
              filtered.map((g) => {
                const active = value?.game_id === g.game_id;
                return (
                  <button
                    key={g.universe_id || g.game_id}
                    type="button"
                    onClick={() => {
                      onChange(g);
                      setOpen(false);
                      setQ("");
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                      active ? "bg-accent/60" : ""
                    }`}
                  >
                    <GameThumb game={g} />
                    <span className="min-w-0 flex-1 truncate">{g.name}</span>
                    {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
          {!loading && games.length > filtered.length && (
            <div className="border-t border-border px-3 py-1.5 text-center text-[11px] text-muted-foreground">
              Showing {filtered.length} of {games.length} — keep typing to narrow
            </div>
          )}
        </div>
      )}
    </div>
  );
}
