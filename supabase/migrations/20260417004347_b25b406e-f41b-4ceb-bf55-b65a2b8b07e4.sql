CREATE OR REPLACE FUNCTION public.get_account_stock(_package_size integer)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.roblox_accounts
  WHERE claimed = false AND package_size = _package_size;
$$;

GRANT EXECUTE ON FUNCTION public.get_account_stock(integer) TO anon, authenticated;