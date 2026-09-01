CREATE TABLE public.paid_script_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_key text NOT NULL UNIQUE,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.paid_script_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paid_script_settings TO authenticated;
GRANT ALL ON public.paid_script_settings TO service_role;

ALTER TABLE public.paid_script_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paid script settings are viewable by everyone"
ON public.paid_script_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert paid script settings"
ON public.paid_script_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update paid script settings"
ON public.paid_script_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete paid script settings"
ON public.paid_script_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_paid_script_settings_updated_at
BEFORE UPDATE ON public.paid_script_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();