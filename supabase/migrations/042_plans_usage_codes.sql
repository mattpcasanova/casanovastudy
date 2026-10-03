-- Plans, usage caps and access codes (free vs Premium).
--
-- user_plans     who has Premium and until when (code, comp, later trial/paid).
--                Kept out of user_profiles on purpose: users may UPDATE their own
--                profile row, and Premium must not be self-grantable. Users can
--                read their own row; only the service role writes.
-- usage_events   one row per metered action (guide, explain, grading); limits
--                are rolling windows counted from here.
-- access_codes   codes Matt hands out (scripts/plans.ts); redemptions record who
--                used which code (once per user per code).
--
-- All writes go through the API routes (service role). The two functions below
-- are SECURITY DEFINER and executable by the service role only.

CREATE TABLE IF NOT EXISTS user_plans (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  premium_until timestamptz,
  source text CHECK (source IN ('code', 'comp', 'trial', 'paid')),
  note text,
  trial_started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own plan" ON user_plans FOR SELECT USING ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS usage_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('guide', 'explain', 'grading')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS usage_events_user_kind_time_idx ON usage_events (user_id, kind, created_at DESC);
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own usage" ON usage_events FOR SELECT USING ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS access_codes (
  code text PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 4 AND 40),
  premium_until timestamptz,          -- fixed end date, or
  months int CHECK (months BETWEEN 1 AND 36), -- months from redemption
  max_redemptions int NOT NULL DEFAULT 1 CHECK (max_redemptions > 0),
  redemptions int NOT NULL DEFAULT 0,
  expires_at timestamptz,             -- last day the code can be redeemed
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((premium_until IS NOT NULL) <> (months IS NOT NULL))
);
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY; -- no policies: service role only

CREATE TABLE IF NOT EXISTS access_code_redemptions (
  code text NOT NULL REFERENCES access_codes(code) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (code, user_id)
);
CREATE INDEX IF NOT EXISTS access_code_redemptions_user_idx ON access_code_redemptions (user_id);
ALTER TABLE access_code_redemptions ENABLE ROW LEVEL SECURITY; -- service role only

-- Count p_kind events in the rolling window; if under p_limit, record one.
-- A per-user advisory lock makes check-and-insert atomic, so two quick
-- requests can't both slip under the limit.
CREATE OR REPLACE FUNCTION public.try_consume_usage(p_user uuid, p_kind text, p_window interval, p_limit int)
RETURNS TABLE (allowed boolean, used int, resets_at timestamptz, event_id bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_used int;
  v_oldest timestamptz;
  v_id bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('usage:' || p_user::text, 0));
  SELECT count(*)::int, min(e.created_at) INTO v_used, v_oldest
    FROM public.usage_events e
   WHERE e.user_id = p_user AND e.kind = p_kind AND e.created_at > now() - p_window;
  IF v_used >= p_limit THEN
    RETURN QUERY SELECT false, v_used, v_oldest + p_window, NULL::bigint;
    RETURN;
  END IF;
  INSERT INTO public.usage_events (user_id, kind) VALUES (p_user, p_kind) RETURNING id INTO v_id;
  RETURN QUERY SELECT true, v_used + 1, coalesce(v_oldest, now()) + p_window, v_id;
END;
$$;

-- Redeem a code for a user. Returns the new premium_until, or raises
-- 'invalid_code' / 'code_expired' / 'code_used_up' / 'already_redeemed'.
CREATE OR REPLACE FUNCTION public.redeem_access_code(p_user uuid, p_code text)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  c public.access_codes%ROWTYPE;
  v_current timestamptz;
  v_until timestamptz;
BEGIN
  SELECT * INTO c FROM public.access_codes WHERE code = upper(trim(p_code)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_code'; END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RAISE EXCEPTION 'code_expired'; END IF;
  IF c.redemptions >= c.max_redemptions THEN RAISE EXCEPTION 'code_used_up'; END IF;
  IF EXISTS (SELECT 1 FROM public.access_code_redemptions r WHERE r.code = c.code AND r.user_id = p_user) THEN
    RAISE EXCEPTION 'already_redeemed';
  END IF;

  SELECT premium_until INTO v_current FROM public.user_plans WHERE user_id = p_user FOR UPDATE;
  IF c.premium_until IS NOT NULL THEN
    v_until := greatest(coalesce(v_current, now()), c.premium_until);
  ELSE
    v_until := greatest(coalesce(v_current, now()), now()) + make_interval(months => c.months);
  END IF;

  INSERT INTO public.access_code_redemptions (code, user_id) VALUES (c.code, p_user);
  UPDATE public.access_codes SET redemptions = redemptions + 1 WHERE code = c.code;
  INSERT INTO public.user_plans (user_id, premium_until, source, note)
       VALUES (p_user, v_until, 'code', 'code ' || c.code)
  ON CONFLICT (user_id) DO UPDATE
       SET premium_until = excluded.premium_until,
           -- A code that doesn't extend an existing comp/paid plan leaves it as is.
           source = CASE WHEN public.user_plans.premium_until >= excluded.premium_until THEN public.user_plans.source ELSE 'code' END,
           note = CASE WHEN public.user_plans.premium_until >= excluded.premium_until THEN public.user_plans.note ELSE excluded.note END,
           updated_at = now();
  RETURN v_until;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.try_consume_usage(uuid, text, interval, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_access_code(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_consume_usage(uuid, text, interval, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(uuid, text) TO service_role;
