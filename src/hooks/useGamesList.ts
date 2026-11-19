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
  // 2026-11-19: one retry, and an empty list is never cached (a failed load used to look like "we don't have your game")
  const load = () => fetch(`${EXECUTOR}/api/public/games`).then((r) => r.json());
  inflight = load()
    .catch(() => new Promise((r) => setTimeout(r, 1500)).then(load))
    .then((j) => {
      const list: GameItem[] = Array.isArray(j?.games) ? j.games : [];
      if (!list.length) throw new Error("empty");
      return j;
    })
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
  const [attempt, setAttempt] = useState(0);
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
  }, [attempt]);
  // failed = the list could not be loaded at all (network / key server down), not "game not supported"
  const failed = !loading && games.length === 0;
  const retry = () => { setLoading(true); setAttempt((a) => a + 1); };
  return { games, loading, failed, retry };
}
