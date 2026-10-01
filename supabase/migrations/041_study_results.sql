-- Answer log for the weak-spot memory: one row per first answer to a quiz
-- question, practice activity or Learn item. Subject/topic are copied onto the
-- row so the history survives the guide being deleted (study_guide_id → NULL).
-- Written directly from the browser; owner-only RLS, append-only for students.
CREATE TABLE IF NOT EXISTS study_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_guide_id uuid REFERENCES study_guides(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('quiz', 'practice', 'learn', 'custom')),
  item_id text NOT NULL,
  item_kind text NOT NULL,
  subject text,
  topic text,
  correct boolean NOT NULL,
  score numeric,            -- 0-100 for AI-scored short answers, else NULL
  answered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_results_user_time_idx ON study_results (user_id, answered_at DESC);
CREATE INDEX IF NOT EXISTS study_results_user_subject_idx ON study_results (user_id, subject);
CREATE INDEX IF NOT EXISTS study_results_guide_idx ON study_results (study_guide_id);

ALTER TABLE study_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own results" ON study_results FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users insert own results" ON study_results FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users delete own results" ON study_results FOR DELETE USING ((select auth.uid()) = user_id);
