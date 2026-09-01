-- Backfill user_id on premium_key_purchases by matching customer_email to auth.users.email
-- so existing buyers can see their previously-purchased keys after login.
UPDATE public.premium_key_purchases pkp
SET user_id = u.id
FROM auth.users u
WHERE pkp.user_id IS NULL
  AND pkp.customer_email IS NOT NULL
  AND lower(pkp.customer_email) = lower(u.email);

-- Allow authenticated users to also view purchases that match their email
-- (covers guest checkouts where user_id was not captured at purchase time).
DROP POLICY IF EXISTS "Users can view purchases by email" ON public.premium_key_purchases;
CREATE POLICY "Users can view purchases by email"
ON public.premium_key_purchases
FOR SELECT
TO authenticated
USING (
  customer_email IS NOT NULL
  AND lower(customer_email) = lower((auth.jwt() ->> 'email'))
);

-- Index to speed up email lookups
CREATE INDEX IF NOT EXISTS idx_premium_key_purchases_email_lower
  ON public.premium_key_purchases (lower(customer_email));
CREATE INDEX IF NOT EXISTS idx_premium_key_purchases_user_id
  ON public.premium_key_purchases (user_id);