-- Practice Tests: standalone link-based MC quizzes that aggregate by AP Chem
-- Big Idea (1-6). Anonymous students take via /p/<share_token>; a separate
-- /p/results/<results_share_token> link gives a fellow teacher read-only access
-- to the aggregate dashboard.
--
-- Intentionally NOT integrated with assignments / class_enrollments — this is a
-- review-window tool. RLS is strict to the owning teacher; all anonymous reads
-- and writes happen via API routes using createAdminClient() after validating
-- the URL token.
--
-- See plan: ~/.claude/plans/i-have-to-do-witty-iverson.md

-- =============================================================================
-- TABLE: practice_tests
-- =============================================================================
CREATE TABLE IF NOT EXISTS practice_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  -- {"1":{"answer":"A","bigIdea":5}, "2":{"answer":"C","bigIdea":5}, ...}
  answer_key JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- {"questions":[...], "stems":{...}} — same shape as the standalone quiz HTML
  questions_content JSONB,
  share_token TEXT NOT NULL UNIQUE,
  results_share_token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_tests_teacher ON practice_tests(teacher_id);

-- =============================================================================
-- TABLE: practice_test_submissions
-- =============================================================================
CREATE TABLE IF NOT EXISTS practice_test_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_test_id UUID NOT NULL REFERENCES practice_tests(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  -- {"1":"A","2":"C", ...}
  responses JSONB NOT NULL,
  score_total INTEGER NOT NULL,
  score_max INTEGER NOT NULL,
  -- {"1":{"correct":3,"total":4}, ..., "6":{"correct":2,"total":5}}
  big_idea_breakdown JSONB NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_test_submissions_test
  ON practice_test_submissions(practice_test_id);

-- =============================================================================
-- RLS: practice_tests
-- Strict to owner. Anonymous access is API-only via createAdminClient().
-- =============================================================================
ALTER TABLE practice_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own practice tests (select)" ON practice_tests
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers manage own practice tests (insert)" ON practice_tests
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers manage own practice tests (update)" ON practice_tests
  FOR UPDATE USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers manage own practice tests (delete)" ON practice_tests
  FOR DELETE USING (auth.uid() = teacher_id);

-- =============================================================================
-- RLS: practice_test_submissions
-- Owning teacher reads. No anonymous policy — submissions are written and read
-- via the admin client after token validation in API routes.
-- =============================================================================
ALTER TABLE practice_test_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers view submissions on own practice tests" ON practice_test_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM practice_tests pt
      WHERE pt.id = practice_test_submissions.practice_test_id
        AND pt.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers delete submissions on own practice tests" ON practice_test_submissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM practice_tests pt
      WHERE pt.id = practice_test_submissions.practice_test_id
        AND pt.teacher_id = auth.uid()
    )
  );

-- =============================================================================
-- updated_at trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION set_practice_tests_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS practice_tests_updated_at ON practice_tests;
CREATE TRIGGER practice_tests_updated_at
  BEFORE UPDATE ON practice_tests
  FOR EACH ROW
  EXECUTE FUNCTION set_practice_tests_updated_at();
