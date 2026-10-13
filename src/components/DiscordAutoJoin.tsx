import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// After a Discord sign-in, Supabase hands us the Discord access token once (session.provider_token).
// Use it to add the user to the COMBO_WICK server (guilds.join). Runs once per user per device.
export function DiscordAutoJoin() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !session?.provider_token) return;
      if (session.user?.app_metadata?.provider !== "discord") return;
      const flag = `cw_discord_joined_${session.user.id}`;
      try { if (localStorage.getItem(flag)) return; } catch { /* storage blocked */ }
      supabase.functions
        .invoke("script-requests", { body: { action: "discord_join", provider_token: session.provider_token } })
        .then(({ data }) => { if ((data as any)?.success) { try { localStorage.setItem(flag, "1"); } catch { /* */ } } })
        .catch(() => {});
    });
    return () => subscription.unsubscribe();
  }, []);
  return null;
}
