
-- Create premium_key_purchases table
CREATE TABLE public.premium_key_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  key_generated TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  customer_email TEXT,
  user_id UUID,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.premium_key_purchases ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (guest checkout support)
CREATE POLICY "Anyone can insert purchases"
ON public.premium_key_purchases
FOR INSERT
TO public
WITH CHECK (true);

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases"
ON public.premium_key_purchases
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow updates on own purchases
CREATE POLICY "Users can update own purchases"
ON public.premium_key_purchases
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_premium_key_purchases_user ON public.premium_key_purchases(user_id);
CREATE INDEX idx_premium_key_purchases_payment ON public.premium_key_purchases(payment_id);
