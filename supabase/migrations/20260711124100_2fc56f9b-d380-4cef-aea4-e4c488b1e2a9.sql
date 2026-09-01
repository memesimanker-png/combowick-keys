ALTER TABLE public.paid_script_settings
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS features text[],
  ADD COLUMN IF NOT EXISTS warning text,
  ADD COLUMN IF NOT EXISTS monthly_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS lifetime_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS monthly_note text,
  ADD COLUMN IF NOT EXISTS lifetime_note text;