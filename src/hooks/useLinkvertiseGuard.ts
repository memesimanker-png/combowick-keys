import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Linkvertise step pages (/verify/step1-3) bounce back to the offer page while the admin master
 * switch verify_settings.linkvertise_enabled is OFF — so old links / bookmarks can't use Linkvertise.
 */
export function useLinkvertiseGuard() {
  const navigate = useNavigate();
  useEffect(() => {
    let alive = true;
    supabase.from("verify_settings").select("linkvertise_enabled").eq("id", 1).maybeSingle()
      .then(({ data }) => {
        if (alive && (data as any)?.linkvertise_enabled === false) navigate("/verify/provider-select", { replace: true });
      });
    return () => { alive = false; };
  }, [navigate]);
}
