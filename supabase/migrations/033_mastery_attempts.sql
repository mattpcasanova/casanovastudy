-- Mastery quiz foundation, part 3: attempt state.
-- One resumable attempt per (assignment, student); the adaptive loop lives
-- inside it. mastery_responses is the source of truth: a row is created when
-- a question is SERVED (answer NULL until answered — unanswered rows are the
-- resumable current round), with the question frozen in question_snapshot so
-- later bank edits don't corrupt history. mastery_attempt_concepts is a
-- denormalized rollup for cheap progress reads.
--
-- See plan: ~/.claude/plans/i-want-to-try-fizzy-pine.md

CREATE TABLE IF NOT EXISTS mastery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed')),
  current_round INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_mastery_attempts_assignment ON mastery_attempts(assignment_id);
CREATE INDEX IF NOT EXISTS idx_mastery_attempts_student ON mastery_attempts(student_id);

CREATE TABLE IF NOT EXISTS mastery_attempt_concepts (
  attempt_id UUID NOT NULL REFERENCES mastery_attempts(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE RESTRICT,
  answered_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  recent_results BOOLEAN[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'mastered', 'max_reached')),
  mastered_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (attempt_id, concept_id)
);

CREATE TABLE IF NOT EXISTS mastery_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES mastery_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES question_bank_questions(id) ON DELETE RESTRICT,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE RESTRICT,
  round_number INTEGER NOT NULL,
  question_snapshot JSONB NOT NULL,
  answer JSONB,
  is_correct BOOLEAN,
  score NUMERIC,
  ai_feedback TEXT,
  served_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  answered_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_mastery_responses_attempt ON mastery_responses(attempt_id, round_number);
CREATE INDEX IF NOT EXISTS idx_mastery_responses_question ON mastery_responses(question_id);

-- =============================================================================
-- RLS. Students read their own attempts + rollups. Deliberately NO student
-- SELECT on mastery_responses — snapshots contain correct answers pre-answer;
-- served payloads flow through API routes that strip them. Teachers read via
-- assignment ownership. All writes go through admin-client API routes.
-- =============================================================================
ALTER TABLE mastery_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own attempts" ON mastery_attempts
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Teachers view attempts on own assignments" ON mastery_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = mastery_attempts.assignment_id
        AND a.teacher_id = auth.uid()
    )
  );

ALTER TABLE mastery_attempt_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own attempt rollups" ON mastery_attempt_concepts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mastery_attempts ma
      WHERE ma.id = mastery_attempt_concepts.attempt_id
        AND ma.student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers view rollups on own assignments" ON mastery_attempt_concepts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mastery_attempts ma
      JOIN assignments a ON a.id = ma.assignment_id
      WHERE ma.id = mastery_attempt_concepts.attempt_id
        AND a.teacher_id = auth.uid()
    )
  );

ALTER TABLE mastery_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers view responses on own assignments" ON mastery_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mastery_attempts ma
      JOIN assignments a ON a.id = ma.assignment_id
      WHERE ma.id = mastery_responses.attempt_id
        AND a.teacher_id = auth.uid()
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_mastery_attempts_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS mastery_attempts_updated_at ON mastery_attempts;
CREATE TRIGGER mastery_attempts_updated_at
  BEFORE UPDATE ON mastery_attempts
  FOR EACH ROW
  EXECUTE FUNCTION set_mastery_attempts_updated_at();
