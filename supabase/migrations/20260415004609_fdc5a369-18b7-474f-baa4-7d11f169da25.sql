
CREATE TABLE public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text text NOT NULL,
  language text NOT NULL,
  translated_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(source_text, language)
);

CREATE INDEX idx_translations_lookup ON public.translations(language, source_text);

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read translations"
ON public.translations
FOR SELECT
TO anon, authenticated
USING (true);
