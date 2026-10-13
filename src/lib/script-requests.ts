import { supabase } from "@/integrations/supabase/client";

export type RequestStatus = "requested" | "in_progress" | "released" | "declined";
export interface ScriptRequest { id: number; universe_id: string; place_id: string; game_name: string; icon_url: string | null; players_at_request: number | null; status: RequestStatus; admin_note: string | null; vote_count: number; discord_thread_id: string | null; created_at: string }
export interface FoundGame { universe_id: string; place_id: string; name: string; playing: number; icon_url: string | null; covered: boolean; request: { id: number; status: RequestStatus; vote_count: number } | null }

/** Calls the script-requests edge function (sends the signed-in user's token automatically). */
export async function callRequests(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke("script-requests", { body });
  if (error) {
    // non-2xx replies keep their JSON body on error.context
    try { const j = await (error as any).context?.json?.(); if (j) return j; } catch { /* */ }
    return { success: false, error: error.message };
  }
  return data;
}

export const fmtCount = (n: number | null | undefined) => (n ?? 0).toLocaleString("en-US");
