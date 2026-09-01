CREATE TABLE public.key_ad_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page TEXT NOT NULL,
  ad_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (page, ad_type)
);

GRANT SELECT ON public.key_ad_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.key_ad_settings TO authenticated;
GRANT ALL ON public.key_ad_settings TO service_role;

ALTER TABLE public.key_ad_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read key ad settings"
ON public.key_ad_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can insert key ad settings"
ON public.key_ad_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update key ad settings"
ON public.key_ad_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete key ad settings"
ON public.key_ad_settings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_key_ad_settings_updated_at
BEFORE UPDATE ON public.key_ad_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults (all currently-active placements enabled)
INSERT INTO public.key_ad_settings (page, ad_type, enabled) VALUES
('verify-step1', 'sliding_ad', true),
('verify-step1', 'skip_ads_banner', true),
('verify-step1', 'skip_ads_float', true),
('verify-step2', 'sliding_ad', true),
('verify-step2', 'skip_ads_banner', true),
('verify-step2', 'skip_ads_float', true),
('verify-step3', 'sliding_ad', true),
('verify-step3', 'skip_ads_banner', true),
('verify-step3', 'skip_ads_float', true),
('verify-provider-select', 'popunder', true),
('verify-provider-select', 'direct_link', true),
('access-key', 'popunder', true),
('access-key', 'skip_ads_banner', true),
('access-key', 'skip_ads_float', true),
('keys', 'popunder', true);