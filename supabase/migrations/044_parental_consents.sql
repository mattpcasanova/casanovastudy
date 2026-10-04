-- Parental consent for students under 13 (COPPA). A student whose birth date
-- says they're under 13 can't use the app until a parent approves by email
-- (/parent-consent). Students who sign in through their school (Clever/Colegia)
-- are covered by the school's consent ('school').
--
-- Its own table, not user_profiles: users may UPDATE their own profile row, and
-- a student must not be able to mark their own consent as granted. Students
-- can read their row; only the service role (API routes) writes. The parent's
-- link carries a random token; only its SHA-256 hash is stored.

CREATE TABLE IF NOT EXISTS parental_consents (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'granted', 'school')),
  parent_email text,
  token_hash text UNIQUE,
  requested_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE parental_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own consent" ON parental_consents FOR SELECT USING ((select auth.uid()) = user_id);
