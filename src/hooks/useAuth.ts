import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}

export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    supabase.rpc("has_role" as any, { _user_id: user.id, _role: "admin" })
      .then(({ data }) => {
        setIsAdmin(!!data);
        setLoading(false);
      });
  }, [user, authLoading]);

  return { isAdmin, loading, user };
}

export function useIsSuperAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }
    supabase.rpc("has_role" as any, { _user_id: user.id, _role: "super_admin" })
      .then(({ data }) => {
        setIsSuperAdmin(!!data);
        setLoading(false);
      });
  }, [user, authLoading]);

  return { isSuperAdmin, loading, user };
}

export const ALL_ADMIN_TABS = ["scripts", "orders", "generate", "accounts", "messages", "users", "admins"] as const;
export type AdminTab = typeof ALL_ADMIN_TABS[number];

export function useAdminTabs() {
  const { user, loading: authLoading } = useAuth();
  const [tabs, setTabs] = useState<AdminTab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setTabs([]); setLoading(false); return; }
    supabase.rpc("get_admin_tabs" as any, { _user_id: user.id })
      .then(({ data }) => {
        setTabs(((data as string[]) || []) as AdminTab[]);
        setLoading(false);
      });
  }, [user, authLoading]);

  return { tabs, loading };
}
