ALTER TABLE public.verify_settings ADD COLUMN IF NOT EXISTS lootlabs_clicks integer NOT NULL DEFAULT 1;
ALTER TABLE public.paid_script_settings ADD COLUMN IF NOT EXISTS paused boolean NOT NULL DEFAULT false;
ALTER TABLE public.paid_script_settings ADD COLUMN IF NOT EXISTS pause_message text;