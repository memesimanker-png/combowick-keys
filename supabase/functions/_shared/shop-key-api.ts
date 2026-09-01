// Shared client for the External Shop Key API (HWID key server).
// NOTE: The public docs list base `v0-roblox-executor-system.vercel.app`, but the
// LIVE working endpoints are on the same host the key generator uses:
//   https://v0-remix-of-roblox-executor-system.vercel.app
// Verified: extend-key / key-info return proper JSON there (404 base returns HTML).
export const SHOP_KEY_API_BASE =
  "https://v0-remix-of-roblox-executor-system.vercel.app";

const COMMON_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
};

export type ShopKeyResult = {
  ok: boolean;
  status: number;
  data: any;
};

async function post(path: string, body: Record<string, unknown>): Promise<ShopKeyResult> {
  const res = await fetch(`${SHOP_KEY_API_BASE}${path}`, {
    method: "POST",
    headers: COMMON_HEADERS,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { success: false, error: text }; }
  return { ok: res.ok && data?.success !== false, status: res.status, data };
}

export async function extendKey(key: string, hours: number): Promise<ShopKeyResult> {
  return post("/api/extend-key", { key, hours });
}

export async function deactivateKey(key: string): Promise<ShopKeyResult> {
  return post("/api/deactivate-key", { key });
}

export async function transferKey(key: string): Promise<ShopKeyResult> {
  return post("/api/transfer-key", { key });
}

export async function keyInfo(key: string): Promise<ShopKeyResult> {
  const res = await fetch(
    `${SHOP_KEY_API_BASE}/api/key-info?key=${encodeURIComponent(key)}`,
    { method: "GET", headers: COMMON_HEADERS }
  );
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { success: false, error: text }; }
  return { ok: res.ok && data?.success !== false, status: res.status, data };
}
