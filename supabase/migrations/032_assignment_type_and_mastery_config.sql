-- Mastery quiz foundation, part 2: assignment type dimension + mastery config.
-- assignments.type defaults to 'file_upload' so every existing row and code
-- path stays valid. Mastery-specific settings live in a 1:1 side table rather
-- than widening assignments; future assignment types repeat this pattern.
--
-- See plan: ~/.claude/plans/i-want-to-try-fizzy-pine.md

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'file_upload'
  CHECK (type IN ('file_upload', 'mastery_quiz'));

-- =============================================================================
-- TABLE: assignment_mastery_config (1:1 with a mastery_quiz assignment)
-- Mastery rule: a concept is mastered when answered_count >= min_questions AND
-- correct-rate over the last min(window_size, answered_count) answers is
-- >= mastery_threshold. max_questions_per_concept is the frustration/cost cap.
-- =============================================================================
CREATE TABLE IF NOT EXISTS assignment_mastery_config (
  assignment_id UUID PRIMARY KEY REFERENCES assignments(id) ON DELETE CASCADE,
  mastery_threshold NUMERIC NOT NULL DEFAULT 0.8
    CHECK (mastery_threshold BETWEEN 0.5 AND 1),
  window_size INTEGER NOT NULL DEFAULT 5 CHECK (window_size BETWEEN 3 AND 10),
  min_questions INTEGER NOT NULL DEFAULT 3 CHECK (min_questions BETWEEN 1 AND 10),
  max_questions_per_concept INTEGER NOT NULL DEFAULT 15
    CHECK (max_questions_per_concept BETWEEN 5 AND 50),
  questions_per_round INTEGER NOT NULL DEFAULT 5
    CHECK (questions_per_round BETWEEN 1 AND 15),
  allowed_types TEXT[] NOT NULL DEFAULT '{multiple_choice,true_false,short_answer}',
  allow_ai_fallback BOOLEAN NOT NULL DEFAULT TRUE
);

-- =============================================================================
-- TABLE: assignment_mastery_concepts
-- Which concepts a mastery assignment covers. RESTRICT: a concept in use by an
-- assignment cannot be deleted.
-- =============================================================================
CREATE TABLE IF NOT EXISTS assignment_mastery_concepts (
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE RESTRICT,
  PRIMARY KEY (assignment_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_amc_concept ON assignment_mastery_concepts(concept_id);

-- =============================================================================
-- RLS: teacher via assignment ownership; students can read config + concept
-- links for assignments in their enrolled classes (thresholds and concept
-- names are safe to expose — bank questions are not).
-- =============================================================================
ALTER TABLE assignment_mastery_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own mastery config (select)" ON assignment_mastery_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_mastery_config.assignment_id
        AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers manage own mastery config (insert)" ON assignment_mastery_config
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_mastery_config.assignment_id
        AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers manage own mastery config (update)" ON assignment_mastery_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_mastery_config.assignment_id
        AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers manage own mastery config (delete)" ON assignment_mastery_config
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_mastery_config.assignment_id
        AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students view mastery config via enrolled class" ON assignment_mastery_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignment_class_links acl
      JOIN class_enrollments ce ON ce.class_id = acl.class_id
      WHERE acl.assignment_id = assignment_mastery_config.assignment_id
        AND ce.student_id = auth.uid()
        AND ce.status = 'active'
    )
  );

ALTER TABLE assignment_mastery_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own mastery concepts (select)" ON assignment_mastery_concepts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_mastery_concepts.assignment_id
        AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers manage own mastery concepts (insert)" ON assignment_mastery_concepts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_mastery_concepts.assignment_id
        AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers manage own mastery concepts (delete)" ON assignment_mastery_concepts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_mastery_concepts.assignment_id
        AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students view mastery concepts via enrolled class" ON assignment_mastery_concepts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignment_class_links acl
      JOIN class_enrollments ce ON ce.class_id = acl.class_id
      WHERE acl.assignment_id = assignment_mastery_concepts.assignment_id
        AND ce.student_id = auth.uid()
        AND ce.status = 'active'
    )
  );
