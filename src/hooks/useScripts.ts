import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Script } from "@/lib/scripts-data";

function mapRow(row: any): Script {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    longDescription: row.long_description || "",
    game: row.game,
    category: row.category,
    tags: row.tags || [],
    createdAt: row.created_at?.split("T")[0] || "",
    updatedAt: row.updated_at?.split("T")[0] || "",
    trending: row.trending || false,
    verified: row.verified || false,
    code: row.code,
    faqs: (row.faqs as any[]) || [],
    game_universe_id: row.game_universe_id || null,
    is_paid: row.is_paid || false,
    youtube_url: row.youtube_url || null,
    game_url: row.game_url || null,
  };
}

export function useAllScripts() {
  return useQuery({
    queryKey: ["scripts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scripts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapRow);
    },
  });
}

export function useScriptBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["scripts", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("scripts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data ? mapRow(data) : null;
    },
    enabled: !!slug,
  });
}

// Lightweight projection for list/card views — skips the heavy `code`,
// `long_description`, and `faqs` columns. Cuts row payload by ~80% on /scripts.
const LIST_COLS = "id,slug,title,description,game,category,tags,created_at,updated_at,trending,verified,game_universe_id,is_paid,youtube_url,game_url";

export function useSearchScripts(query: string, category: string) {
  return useQuery({
    queryKey: ["scripts", "search", query, category],
    // Cards rarely change. Cache aggressively — 15 min stale, 30 min in-memory.
    // Repeat navigations within a session hit ZERO DB queries.
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      let q = supabase.from("scripts").select(LIST_COLS);
      if (category && category !== "All") q = q.eq("category", category);
      if (query) q = q.or(`title.ilike.%${query}%,game.ilike.%${query}%,description.ilike.%${query}%`);
      const { data, error } = await q.order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapRow);
    },
  });
}

export function useRelatedScripts(scriptId: string, game: string, category: string) {
  return useQuery({
    queryKey: ["scripts", "related", scriptId, game, category],
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from("scripts")
        .select(LIST_COLS)
        .neq("id", scriptId)
        .order("trending", { ascending: false })
        .order("updated_at", { ascending: false });

      const filters: string[] = [];
      if (game) filters.push(`game.eq.${game}`);
      if (category) filters.push(`category.eq.${category}`);
      if (filters.length) query = query.or(filters.join(","));

      const { data, error } = await query.limit(20);
      if (error) throw error;
      const rows = (data || []).map(mapRow);
      // Shuffle so users see variety on each visit instead of the same 3.
      for (let i = rows.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rows[i], rows[j]] = [rows[j], rows[i]];
      }
      return rows.slice(0, 3);
    },
    enabled: !!scriptId,
  });
}

export function useFeaturedScripts(limit = 6) {
  return useQuery({
    queryKey: ["scripts", "featured", limit],
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scripts")
        .select(LIST_COLS)
        .order("trending", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []).map(mapRow);
    },
  });
}
