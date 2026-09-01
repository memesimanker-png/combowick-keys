import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Reads the 3 admin-configured Linkvertise links (verify_settings). */
export function useVerifyLinks() {
  const [links, setLinks] = useState<(string | null)[]>([null, null, null]);

  useEffect(() => {
    supabase
      .from("verify_settings")
      .select("linkvertise_link_1, linkvertise_link_2, linkvertise_link_3")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as any;
        if (d) setLinks([d.linkvertise_link_1, d.linkvertise_link_2, d.linkvertise_link_3]);
      });
  }, []);

  return links;
}
