-- Class report + reteach plan for assigned practice (2026-10-23): the same
-- "how the class did" and reteach plan as a graded set, built from students'
-- answers (lib/practice/report.ts). One row per assignment: the AI's class
-- report (with the signature of the answers it read, so the page can offer an
-- update when more students finish) and the saved reteach plan. Written with
-- the service role; the teacher can read their own.

CREATE TABLE IF NOT EXISTS practice_reports (
  assignment_id uuid PRIMARY KEY REFERENCES practice_assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signature text,
  insights jsonb,
  insights_at timestamptz,
  reteach jsonb,
  reteach_at timestamptz
);

ALTER TABLE practice_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers read own practice reports" ON practice_reports;
CREATE POLICY "Teachers read own practice reports" ON practice_reports FOR SELECT USING ((select auth.uid()) = user_id);
