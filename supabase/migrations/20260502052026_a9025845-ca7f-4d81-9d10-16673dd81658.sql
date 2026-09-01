
CREATE OR REPLACE FUNCTION public.check_email_rate_limit(_recipient text, _script_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _hourly_count int;
  _recent_same int;
BEGIN
  SELECT COUNT(*) INTO _hourly_count
  FROM public.email_send_log
  WHERE recipient_email = lower(_recipient)
    AND template_name = 'script-delivery'
    AND status IN ('pending','sent')
    AND created_at > now() - interval '1 hour';

  IF _hourly_count >= 5 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'hourly_limit', 'retry_after_seconds', 3600);
  END IF;

  IF _script_id IS NOT NULL THEN
    SELECT COUNT(*) INTO _recent_same
    FROM public.email_send_log
    WHERE recipient_email = lower(_recipient)
      AND template_name = 'script-delivery'
      AND status IN ('pending','sent')
      AND metadata->>'script_id' = _script_id
      AND created_at > now() - interval '1 minute';

    IF _recent_same >= 1 THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'per_script_cooldown', 'retry_after_seconds', 60);
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;
