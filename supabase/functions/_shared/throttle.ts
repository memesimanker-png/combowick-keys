// Lightweight in-memory per-IP throttle + response cache for edge functions.
// Helps prevent traffic spikes from burning Lovable Cloud CPU credits.
// NOTE: state is per-isolate (best-effort, not strict). For strict limits,
// move this to a Postgres-backed counter.

type Bucket = { count: number; reset: number };
const ipBuckets = new Map<string, Bucket>();

export function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Returns true if the request should be allowed; false if rate-limited.
 * @param key  unique key (usually function-name:ip)
 * @param max  max requests per window
 * @param windowMs window length in milliseconds
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = ipBuckets.get(key);
  if (!b || b.reset < now) {
    ipBuckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= max;
}

// Periodically prune to avoid unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of ipBuckets) if (v.reset < now) ipBuckets.delete(k);
}, 60_000);

export function tooManyRequests(corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: "Too many requests, slow down" }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": "30",
      },
    },
  );
}

// Simple in-memory response cache (keyed by string). Use sparingly.
type CacheEntry = { value: unknown; expires: number };
const responseCache = new Map<string, CacheEntry>();
export function memCacheGet<T = unknown>(key: string): T | null {
  const e = responseCache.get(key);
  if (!e) return null;
  if (e.expires < Date.now()) { responseCache.delete(key); return null; }
  return e.value as T;
}
export function memCacheSet(key: string, value: unknown, ttlMs: number) {
  responseCache.set(key, { value, expires: Date.now() + ttlMs });
  if (responseCache.size > 1000) {
    // evict oldest
    const first = responseCache.keys().next().value;
    if (first) responseCache.delete(first);
  }
}
