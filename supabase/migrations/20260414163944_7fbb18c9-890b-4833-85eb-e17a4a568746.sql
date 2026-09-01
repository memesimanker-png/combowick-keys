INSERT INTO storage.buckets (id, name, public) VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read site assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');
