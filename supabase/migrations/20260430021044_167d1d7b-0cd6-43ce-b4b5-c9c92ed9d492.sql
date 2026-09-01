-- Grant super_admin to original owner
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::app_role FROM auth.users u
WHERE u.email = 'killerkanhai861@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Restrict purchases to super_admin
DROP POLICY IF EXISTS "Admins can view all purchases" ON public.premium_key_purchases;

CREATE POLICY "Super admins can view all purchases"
ON public.premium_key_purchases
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- get_user_email
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: super_admin only';
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  RETURN _email;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_user_email(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO authenticated;

-- grant_role_by_email
CREATE OR REPLACE FUNCTION public.grant_role_by_email(_email text, _role app_role)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: super_admin only';
  END IF;
  IF _role = 'super_admin'::app_role THEN
    RAISE EXCEPTION 'Cannot assign super_admin via dashboard';
  END IF;
  SELECT id INTO _user_id FROM auth.users WHERE lower(email) = lower(_email);
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', _email;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN _user_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.grant_role_by_email(text, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_role_by_email(text, app_role) TO authenticated;

-- revoke_user_role
CREATE OR REPLACE FUNCTION public.revoke_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: super_admin only';
  END IF;
  IF _role = 'super_admin'::app_role THEN
    RAISE EXCEPTION 'Cannot revoke super_admin via dashboard';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.revoke_user_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_user_role(uuid, app_role) TO authenticated;