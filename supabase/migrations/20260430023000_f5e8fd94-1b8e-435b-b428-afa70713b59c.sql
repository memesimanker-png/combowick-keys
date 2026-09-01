-- Remove cached translations whose source is a lookup-key (e.g. "verify_reason_1") instead of real English.
-- These were stored due to a bug where the lookup key was sent to the AI translator.
DELETE FROM public.translations
WHERE source_text ~ '^[a-z][a-z0-9_]*$' AND source_text LIKE '%\_%' ESCAPE '\';