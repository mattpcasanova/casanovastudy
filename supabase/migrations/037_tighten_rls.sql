-- Close wide-open RLS policies. Before this, anyone holding the public anon key
-- could read every grade report and user profile (emails, birth dates), read
-- and edit class rosters, delete grade reports, and create study guides under
-- other users. The app's API routes use the service role and derive identity
-- from the session, so they are unaffected; browser/user-session reads only
-- ever touch the caller's own rows.

-- ── grading_results ─────────────────────────────────────────────────────────
-- Keep: teacher reads/inserts/updates/deletes own; student reads reports about them.
DROP POLICY IF EXISTS "Allow public read access" ON grading_results;
DROP POLICY IF EXISTS "Allow insert with valid user_id" ON grading_results;
DROP POLICY IF EXISTS "Allow delete with valid request" ON grading_results;
DROP POLICY IF EXISTS "Users can update own results" ON grading_results; -- duplicate without WITH CHECK

-- ── student_classes ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all select" ON student_classes;
DROP POLICY IF EXISTS "Allow all insert" ON student_classes;
DROP POLICY IF EXISTS "Allow all update" ON student_classes;
DROP POLICY IF EXISTS "Allow all delete" ON student_classes;

CREATE POLICY "Teachers and students read their roster rows" ON student_classes
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = teacher_id OR (select auth.uid()) = student_id);
CREATE POLICY "Teachers add to their own roster" ON student_classes
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = teacher_id);
CREATE POLICY "Teachers update their own roster" ON student_classes
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = teacher_id)
  WITH CHECK ((select auth.uid()) = teacher_id);
CREATE POLICY "Teachers delete from their own roster" ON student_classes
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = teacher_id);

-- ── user_profiles ───────────────────────────────────────────────────────────
-- SELECT was USING (true): every profile readable by anyone.
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can view public profiles" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);
CREATE POLICY "Signed-in users can view public profiles" ON user_profiles
  FOR SELECT TO authenticated
  USING (is_profile_public = true);

-- INSERT stays open to the no-session signup call (email confirmation means
-- there is no session yet; the FK to auth.users still requires a real account),
-- but a signed-in user can no longer create a profile for someone else.
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT
  WITH CHECK ((select auth.uid()) IS NULL OR (select auth.uid()) = id);

-- ── study_guides ────────────────────────────────────────────────────────────
-- Reads stay public (guides are shared by link).
DROP POLICY IF EXISTS "Allow insert with valid user_id" ON study_guides;
CREATE POLICY "Users can insert own guides" ON study_guides
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own guides" ON study_guides;
CREATE POLICY "Users can update own guides" ON study_guides
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
