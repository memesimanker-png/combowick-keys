CREATE POLICY "Anyone can insert scripts"
ON public.scripts
FOR INSERT
WITH CHECK (true);