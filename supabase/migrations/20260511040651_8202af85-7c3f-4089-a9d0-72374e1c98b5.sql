-- Add custom thumbnail URL to scripts
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Create public bucket for script thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('script-thumbnails', 'script-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Script thumbnails are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'script-thumbnails');

-- Admin-only write/update/delete
CREATE POLICY "Admins can upload script thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'script-thumbnails' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update script thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'script-thumbnails' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete script thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'script-thumbnails' AND public.has_role(auth.uid(), 'admin'));