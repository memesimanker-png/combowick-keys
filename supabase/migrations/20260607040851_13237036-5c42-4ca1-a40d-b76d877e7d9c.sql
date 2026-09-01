CREATE TABLE public.verify_settings (
  id integer PRIMARY KEY DEFAULT 1,
  direct_link_clicks integer NOT NULL DEFAULT 2,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT verify_settings_singleton CHECK (id = 1),
  CONSTRAINT verify_settings_clicks_range CHECK (direct_link_clicks >= 1 AND direct_link_clicks <= 10)
);

GRANT SELECT ON public.verify_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.verify_settings TO authenticated;
GRANT ALL ON public.verify_settings TO service_role;

ALTER TABLE public.verify_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verify settings readable by everyone" ON public.verify_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins update verify settings" ON public.verify_settings
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins insert verify settings" ON public.verify_settings
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

INSERT INTO public.verify_settings (id, direct_link_clicks) VALUES (1, 2)
  ON CONFLICT (id) DO NOTHING;