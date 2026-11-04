const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const CACHE_KEY = "roblox_thumb_cache_v6"; // bumped: now wraps in wsrv.nl
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry { url: string; ts: number; }

function getCache(): Record<string, CacheEntry> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; }
}

function setCache(cache: Record<string, CacheEntry>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

/**
 * Wrap a thumbnail URL in the free wsrv.nl image proxy/CDN to:
 *   - convert PNG → WebP (≈70% smaller)
 *   - resize to actual display size (no more 420×420 served for 64px slots)
 *   - serve from a global CDN with long cache headers
 * On a 5K visits/day site this can cut image bandwidth by 80%+.
 */
function compress(url: string): string {
  if (!url) return url;
  // Don't double-wrap
  if (url.includes("wsrv.nl")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=160&h=160&output=webp&q=80`;
}

export async function fetchGameThumbnailByUniverseId(universeId: number): Promise<string | null> {
  if (!universeId) return null;
  const key = String(universeId);
  const cache = getCache();
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.url;

  // Straight from public storage: calling a function once per game on every fresh visit used up the Edge Function quota.
  // New games get their file when they're added. A missing file shows our logo through wsrv's default image.
  const direct = `${compress(`${SUPABASE_URL}/storage/v1/object/public/game-thumbnails/${key}.png`)}&default=${encodeURIComponent("https://keys.combowick.com/images/combo-wick-logo.png")}`;
  const c = getCache();
  c[key] = { url: direct, ts: Date.now() };
  setCache(c);
  return direct;
}

