-- Inventory of accounts available for delivery
CREATE TABLE IF NOT EXISTS public.roblox_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  password text NOT NULL,
  package_size integer NOT NULL,
  claimed boolean NOT NULL DEFAULT false,
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  purchase_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roblox_accounts_unclaimed
  ON public.roblox_accounts (package_size) WHERE claimed = false;
CREATE INDEX IF NOT EXISTS idx_roblox_accounts_claimed_by
  ON public.roblox_accounts (claimed_by);

ALTER TABLE public.roblox_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own claimed accounts" ON public.roblox_accounts;
CREATE POLICY "Users see own claimed accounts"
  ON public.roblox_accounts FOR SELECT
  USING (claimed_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage accounts" ON public.roblox_accounts;
CREATE POLICY "Admins manage accounts"
  ON public.roblox_accounts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Purchase records for accounts
CREATE TABLE IF NOT EXISTS public.roblox_account_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_size integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  payment_id text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.roblox_account_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own account purchases" ON public.roblox_account_purchases;
CREATE POLICY "Users see own account purchases"
  ON public.roblox_account_purchases FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage account purchases" ON public.roblox_account_purchases;
CREATE POLICY "Admins manage account purchases"
  ON public.roblox_account_purchases FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Atomic claim function: assigns N unclaimed accounts of given package_size to caller
CREATE OR REPLACE FUNCTION public.claim_accounts_for_purchase(
  _user_id uuid,
  _package_size integer,
  _quantity integer,
  _purchase_id uuid
)
RETURNS SETOF public.roblox_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ids uuid[];
BEGIN
  SELECT array_agg(id) INTO _ids FROM (
    SELECT id FROM public.roblox_accounts
    WHERE claimed = false AND package_size = _package_size
    ORDER BY created_at
    LIMIT _quantity
    FOR UPDATE SKIP LOCKED
  ) sub;

  IF _ids IS NULL OR array_length(_ids, 1) < _quantity THEN
    RAISE EXCEPTION 'Insufficient inventory: requested %, available %', _quantity, COALESCE(array_length(_ids,1),0);
  END IF;

  RETURN QUERY
  UPDATE public.roblox_accounts
  SET claimed = true,
      claimed_by = _user_id,
      claimed_at = now(),
      purchase_id = _purchase_id
  WHERE id = ANY(_ids)
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_accounts_for_purchase(uuid,integer,integer,uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_accounts_for_purchase(uuid,integer,integer,uuid) TO authenticated, service_role;

-- Seed inventory (75 unclaimed accounts)
INSERT INTO public.roblox_accounts (username, password, package_size) VALUES
  ('reservedito', '7tia9kVnNVA2oWclE0aE', 50),
  ('ChillThunder67', 'Generated$1978163', 50),
  ('dejectedshounen', 'pslPvXcftESBHE7bmqv2', 50),
  ('Li0nC00kieBac0n20', 'Generated$8829849', 50),
  ('ProWolfSilver90', 'Generated$8998821', 50),
  ('TurboBaconHero45', 'Generated$3865792', 50),
  ('hirayamazanshin', 'idqirmiQ5ZGzKNaw4fXE', 50),
  ('ChaseStealthGolden_Y', 'Generated$8837713', 50),
  ('spherical_ritsuko82', '9qlgzDMP19eE0UUudH5v', 50),
  ('Xx_OmegaBuilderHunte', 'Generated$5072312', 50),
  ('FrostDarkGlitch12', 'Generated$1284795', 50),
  ('XxLegendDrag0nxX2007', 'Generated$9045162', 50),
  ('XxPr0ClawC0dexX', 'Generated$1815994', 50),
  ('R0ck3tR0gu3Bl0ck', 'Generated$6108369', 50),
  ('XxAquaBuilderM00nxX', 'Generated$5561236', 50),
  ('FlamePhoenix93_YT', 'Generated$8252867', 50),
  ('Neon_PLAYZ84', 'Generated$9754344', 50),
  ('N3onSilv3rFury', 'Generated$4981648', 50),
  ('Gamer_Craze202050', 'Generated$7954603', 50),
  ('SparklyBuilder202321', 'Generated$4882722', 50),
  ('XxPixelMasterxX26_YT', 'Generated$3069760', 50),
  ('GraysonPhoenixBlizza', 'Generated$1636511', 50),
  ('Charl0tteBac0nBlast', 'Generated$1045063', 50),
  ('XxGamerFlickPixelxX', 'Generated$1916920', 50),
  ('XxCodeFoxxX68', 'Generated$5524260', 50),
  ('ZoomArrow201934', 'Generated$7887796', 100),
  ('Xx_WilliamStormyFire', 'Generated$3148094', 100),
  ('XxBrooklynBytexX71_Y', 'Generated$8820118', 100),
  ('trifonovtremolo', 'Ax3T936g4C9STGeNRG8f', 100),
  ('rekiarete', 'E50kySd3eBKFC7HOigUy', 100),
  ('XxPlayzRavenMasterxX', 'Generated$5334340', 100),
  ('lividincoherent1', 'yZPniq8SkUuiRHC3OGyV', 100),
  ('Hyp3rCraz32016YT', 'Generated$4154149', 100),
  ('V0rtexCircuitBuilder', 'Generated$3744654', 100),
  ('B3ast_Tig3r30', 'Generated$6529523', 100),
  ('AceRocket202137', 'Generated$6508788', 100),
  ('Aubr3yV3n0m2021', 'Generated$5086205', 100),
  ('StarryPro36', 'Generated$9472958', 100),
  ('Xx_BladeSilverInfern', 'Generated$9342099', 100),
  ('AubreyNinjaStar2009', 'Generated$2235544', 100),
  ('WraithCyb3rDuck2008', 'Generated$3000362', 100),
  ('MaxLionBlock14', 'Generated$3719128', 100),
  ('Charl0tte_Drift15', 'Generated$9519218', 100),
  ('Cart3r_Flam385', 'Generated$2431102', 100),
  ('DancerViper53YT', 'Generated$3750598', 100),
  ('VoidDancerEpic2018', 'Generated$3642449', 100),
  ('Owen_SPARK62', 'Generated$8141019', 100),
  ('Gabri3lFlash26', 'Generated$3430638', 100),
  ('glitchkitamura', 'Y0JWDTzbIMXN4ETSOciE', 100),
  ('HannahMast3rEpic', 'Generated$2541125', 100),
  ('Infern0SilverDrift', 'Generated$1876820', 100),
  ('GraysonTigerSaber200', 'Generated$5419283', 100),
  ('RiftNe0n200877', 'Generated$6946277', 100),
  ('GabrielFusion84YT', 'Generated$7489300', 100),
  ('XxPho3nixCrystalRav3', 'Generated$9047092', 100),
  ('Byte_CIRCUIT201776', 'Generated$5102084', 100),
  ('Ezra_C0de58', 'Generated$2254318', 100),
  ('HazelMysticHyper2011', 'Generated$8361307', 100),
  ('H3roWraith42', 'Generated$6526584', 100),
  ('moritaunmoored', 'S2AplVSyIrWP9G9E5suc', 100),
  ('akitokarma340', 'MRTNL0WQSG5o6DsPbeQW', 100),
  ('SparkChas3B3ar', 'Generated$4929620', 100),
  ('AidenZeroKing2022', 'Generated$2003183', 100),
  ('Pix3lat3dPow3r200364', 'Generated$4224257', 100),
  ('AmeliaBlizzardTurb05', 'Generated$2598401', 100),
  ('Bl0ck_Aqua85', 'Generated$5729427', 100),
  ('Her0RavenW0lf', 'Generated$2200510', 100),
  ('RocketSpark201132', 'Generated$2241949', 100),
  ('BlastRoguePlayz2012', 'Generated$7059308', 100),
  ('XxShadowFuryxX62', 'Generated$3675018', 100),
  ('Ban3_MAGIC2017', 'Generated$6579433', 100),
  ('VoidGamerHero2013', 'Generated$8839695', 100),
  ('XxLavaS0nicF0xxX89', 'Generated$4994972', 100),
  ('RileyKnightIce2021', 'Generated$9655451', 100),
  ('Rogu3Night2011', 'Generated$9068866', 100);