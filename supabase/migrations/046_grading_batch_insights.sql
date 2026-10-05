-- Class report for a batch (/grade-exam/batch/[id]): the AI's topic grouping and
-- common-mistakes summary, saved so it isn't regenerated on every visit.
-- `signature` captures the marks it was built from (lib/grading/insights.ts);
-- when a teacher changes a mark the page offers to refresh it.
-- Written by the API with the service role; owners can read their own rows.
CREATE TABLE IF NOT EXISTS grading_batch_insights (
  batch_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signature text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE grading_batch_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners read their batch insights" ON grading_batch_insights;
CREATE POLICY "Owners read their batch insights" ON grading_batch_insights
  FOR SELECT USING (auth.uid() = user_id);
