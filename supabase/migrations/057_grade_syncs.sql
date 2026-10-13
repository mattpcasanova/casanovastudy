-- Scores sent to outside gradebooks (2026-10-13). For Google Classroom: the
-- assignment (courseWork) the app created for a graded set, so sending again
-- updates the same assignment instead of making another. Service role writes;
-- teachers read their own rows.

CREATE TABLE IF NOT EXISTS grade_syncs (
  batch_id uuid NOT NULL,
  target text NOT NULL CHECK (target IN ('google_classroom')),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_course_id text NOT NULL,
  external_id text NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (batch_id, target)
);

ALTER TABLE grade_syncs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers read own grade syncs" ON grade_syncs;
CREATE POLICY "Teachers read own grade syncs" ON grade_syncs FOR SELECT USING ((select auth.uid()) = user_id);
