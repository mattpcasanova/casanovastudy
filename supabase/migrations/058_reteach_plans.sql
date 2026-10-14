-- Reteach plans (2026-10-13): one saved plan per graded set, written from its
-- class report and marks (lib/grading/reteach.ts + ClaudeService.reteachPlan).
-- data holds the plan, the focus topics and the student groups (names live
-- here, never in the AI prompt). Written with the service role; the owner
-- can read their own.

CREATE TABLE IF NOT EXISTS reteach_plans (
  batch_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reteach_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers read own reteach plans" ON reteach_plans;
CREATE POLICY "Teachers read own reteach plans" ON reteach_plans FOR SELECT USING ((select auth.uid()) = user_id);
