DELETE FROM public.translations
WHERE source_text ILIKE '%3-Day%'
   OR source_text ILIKE '%3 Days Full Access%'
   OR translated_text ILIKE '%3-Day%'
   OR translated_text ILIKE '%3 Days Full Access%'
   OR translated_text ILIKE '%3 days full access%';