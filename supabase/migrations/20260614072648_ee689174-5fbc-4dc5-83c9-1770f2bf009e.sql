CREATE TABLE public.key_discounts (
  tier_id text PRIMARY KEY,
  percent_off integer NOT NULL DEFAULT 0 CHECK (percent_off >= 0 AND percent_off <= 90),
  active boolean NOT NULL DEFAULT false,
  label text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.key_discounts TO anon, authenticated;
GRANT ALL ON public.key_discounts TO service_role;

ALTER TABLE public.key_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view discounts"
  ON public.key_discounts FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert discounts"
  ON public.key_discounts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update discounts"
  ON public.key_discounts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.key_discounts (tier_id, percent_off, active, label) VALUES
  ('monthly', 0, false, 'Limited-Time Sale'),
  ('lifetime', 0, false, 'Limited-Time Sale')
ON CONFLICT (tier_id) DO NOTHING;