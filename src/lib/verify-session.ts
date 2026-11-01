// Server-side Linkvertise step chain (2026-11-01). One random session id per key attempt: step 1 reports "start"
// when its Linkvertise opens, every /ad-return reports its step + Linkvertise's ?hash=, and issue-verify-token only
// hands out a key token for a complete, in-order, not-too-fast chain. (Before this the token needed no proof at all.)
import { supabase } from "@/integrations/supabase/client";

const SID_KEY = "verify_sid";

export function newVerifySid(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  const sid = Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("");
  try { localStorage.setItem(SID_KEY, sid); } catch { /* private mode: the chain just can't finish */ }
  return sid;
}

export function verifySid(): string | null {
  try { return localStorage.getItem(SID_KEY); } catch { return null; }
}

// -> { ok, reason } ; reason "network" when the server couldn't be reached (callers let the user continue then)
// deno-lint-ignore no-explicit-any
export async function reportStep(body: Record<string, unknown>, timeoutMs = 4000): Promise<{ ok: boolean; reason?: string; data?: any }> {
  const call = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("issue-verify-token", { body });
      if (!error) return { ok: !!data?.success, reason: data?.reason, data };
      let reason = "error";
      try { const j = await (error as any)?.context?.json?.(); reason = j?.reason || j?.error || reason; } catch { /* keep */ }
      return { ok: false, reason };
    } catch {
      return { ok: false, reason: "network" };
    }
  })();
  const timer = new Promise<{ ok: boolean; reason: string }>((r) => setTimeout(() => r({ ok: false, reason: "network" }), timeoutMs));
  return Promise.race([call, timer]);
}
