import { useEffect, useState } from "react";

export interface GameItem {
  universe_id: string | null;
  game_id: string;
  name: string;
}

const EXECUTOR = "https://v0-remix-of-roblox-executor-system.vercel.app";
const LS_KEY = "cw_games_list_v1";
const TTL = 5 * 60 * 1000; // 5 min — near-instant for new games; endpoint is also CDN + Redis cached (busted on admin save).

let mem: GameItem[] | null = null;
let memAt = 0;
let inflight: Promise<GameItem[]> | null = null;

async function getGames(): Promise<GameItem[]> {
  const now = Date.now();
  if (mem && now - memAt < TTL) return mem;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p?.games) && typeof p?.at === "number" && now - p.at < TTL) {
        mem = p.games;
        memAt = p.at;
        return mem;
      }
    }
  } catch {
    /* ignore */
  }
  if (inflight) return inflight;
  inflight = fetch(`${EXECUTOR}/api/public/games`)
    .then((r) => r.json())
    .then((j) => {
      const games: GameItem[] = Array.isArray(j?.games) ? j.games : [];
      mem = games;
      memAt = Date.now();
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ games, at: memAt }));
      } catch {
        /* ignore */
      }
      inflight = null;
      return games;
    })
    .catch(() => {
      inflight = null;
      return mem || [];
    });
  return inflight;
}

export function useGamesList() {
  const [games, setGames] = useState<GameItem[]>(mem || []);
  const [loading, setLoading] = useState(!mem);
  useEffect(() => {
    let alive = true;
    getGames().then((g) => {
      if (alive) {
        setGames(g);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);
  return { games, loading };
}
