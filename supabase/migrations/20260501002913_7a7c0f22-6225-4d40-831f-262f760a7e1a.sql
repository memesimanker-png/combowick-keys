-- Per-admin tab permissions
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  user_id uuid PRIMARY KEY,
  tabs text[] NOT NULL DEFAULT ARRAY['scripts','accounts','messages','users']::text[],
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin manages admin_permissions"
ON public.admin_permissions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can read own permissions"
ON public.admin_permissions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Helper to fetch effective tabs
CREATE OR REPLACE FUNCTION public.get_admin_tabs(_user_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tabs text[];
BEGIN
  IF public.has_role(_user_id, 'super_admin'::app_role) THEN
    RETURN ARRAY['scripts','orders','generate','accounts','messages','users','admins']::text[];
  END IF;

  SELECT tabs INTO _tabs FROM public.admin_permissions WHERE user_id = _user_id;
  IF _tabs IS NULL THEN
    -- Default for admins with no row yet
    RETURN ARRAY['scripts','accounts','messages','users']::text[];
  END IF;
  RETURN _tabs;
END;
$$;

-- Super-admin RPC to set permissions for a user (idempotent upsert)
CREATE OR REPLACE FUNCTION public.set_admin_tabs(_user_id uuid, _tabs text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: super_admin only';
  END IF;
  INSERT INTO public.admin_permissions (user_id, tabs, updated_at, updated_by)
  VALUES (_user_id, _tabs, now(), auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET tabs = EXCLUDED.tabs, updated_at = now(), updated_by = auth.uid();
END;
$$;