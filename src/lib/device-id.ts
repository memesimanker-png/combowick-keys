/**
 * Stable per-device/browser identifier used to bind a key-extension request to
 * the returning session. This is NOT the executor HWID — it's a browser-side
 * identifier that guarantees only the device that started an extension can
 * complete it. Persisted in localStorage so it survives the off-site round trip.
 */
const STORAGE_KEY = "cw_device_id";

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id || id.length < 16) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      id = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // Fallback (non-persistent) if storage is unavailable.
    return "no-storage-" + Math.random().toString(16).slice(2);
  }
}
