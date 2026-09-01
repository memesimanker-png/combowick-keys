-- Add reply columns
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS admin_reply text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS replied_by uuid;

-- user_id is now required
ALTER TABLE public.contact_messages
  ALTER COLUMN user_id SET NOT NULL;

-- Drop old open-anon insert policy
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;

-- Rate-limit function: returns true if the user is below the per-hour limit
CREATE OR REPLACE FUNCTION public.check_contact_rate_limit(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) < 3
  FROM public.contact_messages
  WHERE user_id = _user_id
    AND created_at > now() - interval '1 hour';
$$;

REVOKE EXECUTE ON FUNCTION public.check_contact_rate_limit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_contact_rate_limit(uuid) TO authenticated;

-- New insert policy: must be signed in, must own the row, must be under rate limit
CREATE POLICY "Authenticated users can submit (rate limited)"
ON public.contact_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.check_contact_rate_limit(auth.uid())
);

-- Users can view their own messages (so they can see the admin reply)
CREATE POLICY "Users can view their own messages"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Revoke anon insert grant
REVOKE INSERT ON public.contact_messages FROM anon;