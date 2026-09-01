ALTER TABLE public.verify_settings
  ADD COLUMN IF NOT EXISTS access_key_clicks integer NOT NULL DEFAULT 2;

UPDATE public.verify_settings SET access_key_clicks = 2 WHERE id = 1 AND access_key_clicks IS NULL;