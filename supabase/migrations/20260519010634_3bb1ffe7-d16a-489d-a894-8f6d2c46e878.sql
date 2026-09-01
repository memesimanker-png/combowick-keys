
CREATE TABLE public.verify_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  ip text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_verify_tokens_hash ON public.verify_tokens(token_hash);
CREATE INDEX idx_verify_tokens_expires ON public.verify_tokens(expires_at);
ALTER TABLE public.verify_tokens ENABLE ROW LEVEL SECURITY;
-- No client policies; only edge functions (service role) read/write.

CREATE TABLE public.hwid_key_ip_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hwid_key_ip_log_ip_created ON public.hwid_key_ip_log(ip, created_at DESC);
ALTER TABLE public.hwid_key_ip_log ENABLE ROW LEVEL SECURITY;
