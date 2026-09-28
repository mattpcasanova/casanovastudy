-- Account-synced study progress (outline checkmarks, plan "studied" units,
-- practice results, Learn-mode review state). One row per user/guide/kind;
-- owner-only access. Written directly from the browser (RLS enforces owner).
CREATE TABLE IF NOT EXISTS study_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_guide_id uuid NOT NULL REFERENCES study_guides(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('outline', 'plan', 'practice', 'learn')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, study_guide_id, kind)
);
CREATE INDEX IF NOT EXISTS study_progress_user_idx ON study_progress (user_id);
ALTER TABLE study_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own progress" ON study_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progress" ON study_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON study_progress FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own progress" ON study_progress FOR DELETE USING (auth.uid() = user_id);
