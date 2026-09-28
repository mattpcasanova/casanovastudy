-- Only the owner may delete a study guide. Replaces the permissive
-- "Allow delete with valid request" (USING true) policy, which let anyone with
-- the public anon key delete any guide via the REST API.
-- Requires the delete API to run as the signed-in user (see
-- app/api/study-guides/[id]/route.ts, which now uses the caller's token).
DROP POLICY IF EXISTS "Allow delete with valid request" ON study_guides;
DROP POLICY IF EXISTS "Users can delete own guides" ON study_guides;
CREATE POLICY "Users can delete own guides" ON study_guides
  FOR DELETE USING (auth.uid() = user_id);
