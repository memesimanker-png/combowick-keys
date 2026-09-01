// Tiny Upstash Redis REST client for edge functions.
// Uses KV_REST_API_URL + KV_REST_API_TOKEN (write) / KV_REST_API_READ_ONLY_TOKEN (read).
// Falls back gracefully if env vars are missing — never throws into callers.

const URL_BASE = Deno.env.get("KV_REST_API_URL");
const WRITE_TOKEN = Deno.env.get("KV_REST_API_TOKEN");
const READ_TOKEN = Deno.env.get("KV_REST_API_READ_ONLY_TOKEN") ?? WRITE_TOKEN;

export const redisEnabled = !!(URL_BASE && WRITE_TOKEN);

async function call(path: string, token: string | undefined): Promise<any | null> {
  if (!URL_BASE || !token) return null;
  try {
    const res = await fetch(`${URL_BASE}/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.result ?? null;
  } catch {
    return null;
  }
}

/** GET a string value. Returns null on miss / error / disabled. */
export async function redisGet(key: string): Promise<string | null> {
  const r = await call(`get/${encodeURIComponent(key)}`, READ_TOKEN);
  return typeof r === "string" ? r : null;
}

/** GET + JSON.parse. */
export async function redisGetJSON<T = unknown>(key: string): Promise<T | null> {
  const s = await redisGet(key);
  if (!s) return null;
  try { return JSON.parse(s) as T; } catch { return null; }
}

/** SET with TTL (seconds). Uses POST body so large values don't hit URL limits. */
export async function redisSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!URL_BASE || !WRITE_TOKEN) return;
  try {
    await fetch(`${URL_BASE}/set/${encodeURIComponent(key)}?EX=${ttlSeconds}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${WRITE_TOKEN}` },
      body: value,
    });
  } catch {
    // swallow
  }
}

export async function redisSetJSON(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redisSet(key, JSON.stringify(value), ttlSeconds);
}

/** INCR a counter; returns new value or null on failure. Use for rate-limit/analytics. */
export async function redisIncr(key: string, ttlSeconds?: number): Promise<number | null> {
  const r = await call(`incr/${encodeURIComponent(key)}`, WRITE_TOKEN);
  if (ttlSeconds && typeof r === "number" && r === 1) {
    await call(`expire/${encodeURIComponent(key)}/${ttlSeconds}`, WRITE_TOKEN);
  }
  return typeof r === "number" ? r : null;
}

export async function redisDel(key: string): Promise<void> {
  await call(`del/${encodeURIComponent(key)}`, WRITE_TOKEN);
}
