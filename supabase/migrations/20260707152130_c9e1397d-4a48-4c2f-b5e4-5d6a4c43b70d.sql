-- TASK 1 & 2 config: 3 Linkvertise links + configurable extension hours on verify_settings
ALTER TABLE public.verify_settings
  ADD COLUMN IF NOT EXISTS linkvertise_link_1 text,
  ADD COLUMN IF NOT EXISTS linkvertise_link_2 text,
  ADD COLUMN IF NOT EXISTS linkvertise_link_3 text,
  ADD COLUMN IF NOT EXISTS extension_hours integer NOT NULL DEFAULT 11;

-- Remove LootLabs remnant config
ALTER TABLE public.verify_settings DROP COLUMN IF EXISTS lootlabs_clicks;

-- Seed default Linkvertise links (admin can edit). Uses dynamic-link account 405401.
UPDATE public.verify_settings
SET linkvertise_link_1 = COALESCE(linkvertise_link_1, 'https://link-to.net/405401'),
    linkvertise_link_2 = COALESCE(linkvertise_link_2, 'https://link-to.net/405401'),
    linkvertise_link_3 = COALESCE(linkvertise_link_3, 'https://link-to.net/405401')
WHERE id = 1;

-- TASK 3 & 4: pending key-extension records + replay/anti-abuse tracking
CREATE TABLE IF NOT EXISTS public.key_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  hwid text NOT NULL,
  key_value text NOT NULL,
  ip text,
  hours integer NOT NULL DEFAULT 11,
  status text NOT NULL DEFAULT 'pending', -- pending | processing | completed
  before_expires_at timestamptz,
  after_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes')
);

CREATE INDEX IF NOT EXISTS idx_key_extensions_hwid ON public.key_extensions (hwid);
CREATE INDEX IF NOT EXISTS idx_key_extensions_key ON public.key_extensions (key_value);
CREATE INDEX IF NOT EXISTS idx_key_extensions_created ON public.key_extensions (created_at);

-- Only edge functions (service_role) touch this table; admins may read for auditing.
GRANT SELECT ON public.key_extensions TO authenticated;
GRANT ALL ON public.key_extensions TO service_role;

ALTER TABLE public.key_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view key extensions"
ON public.key_extensions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));