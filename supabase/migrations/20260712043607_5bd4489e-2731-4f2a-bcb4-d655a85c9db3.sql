ALTER TABLE public.paid_script_settings
  ADD COLUMN IF NOT EXISTS hide_monthly boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_lifetime boolean NOT NULL DEFAULT false;