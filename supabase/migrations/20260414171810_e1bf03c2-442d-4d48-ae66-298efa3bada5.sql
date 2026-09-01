
-- Fix overly permissive insert on scripts
DROP POLICY IF EXISTS "Anyone can insert scripts" ON public.scripts;
CREATE POLICY "Admins can insert scripts" ON public.scripts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix overly permissive insert on purchases  
DROP POLICY IF EXISTS "Anyone can insert purchases" ON public.premium_key_purchases;
CREATE POLICY "Authenticated users can insert purchases" ON public.premium_key_purchases
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
