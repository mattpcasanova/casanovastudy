-- Mastery quiz foundation, part 1: concepts + hybrid question bank.
-- Concepts are teacher-owned tags (optionally scoped to a class) that questions
-- and mastery assignments hang off. Questions enter the bank via manual entry,
-- AI suggestion, material extraction, or runtime generation; only 'approved'
-- questions are served from the bank. question_review_events records every
-- approve/edit/decline as future tuning signal.
--
-- See plan: ~/.claude/plans/i-want-to-try-fizzy-pine.md

-- =============================================================================
-- TABLE: concepts
-- =============================================================================
CREATE TABLE IF NOT EXISTS concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, class_id, name)
);

CREATE INDEX IF NOT EXISTS idx_concepts_teacher ON concepts(teacher_id);
CREATE INDEX IF NOT EXISTS idx_concepts_class ON concepts(class_id);

-- =============================================================================
-- TABLE: question_bank_questions
-- correct_answer shape by type:
--   multiple_choice: {"index": 2}
--   true_false:      {"value": true}
--   short_answer:    {"sample_answer": "...", "rubric_notes": "..."}
-- =============================================================================
CREATE TABLE IF NOT EXISTS question_bank_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'short_answer')),
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer JSONB NOT NULL,
  explanation TEXT,
  difficulty SMALLINT NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3),
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'ai_suggested', 'ai_extracted', 'ai_runtime')),
  status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('suggested', 'approved', 'declined', 'archived')),
  source_material_url TEXT,
  times_served INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qbq_teacher ON question_bank_questions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_qbq_concept_status ON question_bank_questions(concept_id, status);

-- =============================================================================
-- TABLE: question_review_events
-- Write-only signal store: every approve/edit/decline, with before/after
-- snapshots on edits. Feeds future per-teacher suggestion tuning.
-- =============================================================================
CREATE TABLE IF NOT EXISTS question_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES question_bank_questions(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approve', 'edit', 'decline')),
  before_snapshot JSONB,
  after_snapshot JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qre_teacher ON question_review_events(teacher_id);
CREATE INDEX IF NOT EXISTS idx_qre_question ON question_review_events(question_id);

-- =============================================================================
-- RLS: teacher-only on all three tables. Deliberately NO student SELECT on
-- question_bank_questions — correct answers live there; students only ever see
-- questions through the serving API (admin client strips correct_answer).
-- =============================================================================
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own concepts (select)" ON concepts
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers manage own concepts (insert)" ON concepts
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers manage own concepts (update)" ON concepts
  FOR UPDATE USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers manage own concepts (delete)" ON concepts
  FOR DELETE USING (auth.uid() = teacher_id);

ALTER TABLE question_bank_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own questions (select)" ON question_bank_questions
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers manage own questions (insert)" ON question_bank_questions
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers manage own questions (update)" ON question_bank_questions
  FOR UPDATE USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers manage own questions (delete)" ON question_bank_questions
  FOR DELETE USING (auth.uid() = teacher_id);

ALTER TABLE question_review_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers view own review events" ON question_review_events
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers insert own review events" ON question_review_events
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

-- =============================================================================
-- updated_at triggers
-- =============================================================================
CREATE OR REPLACE FUNCTION set_concepts_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS concepts_updated_at ON concepts;
CREATE TRIGGER concepts_updated_at
  BEFORE UPDATE ON concepts
  FOR EACH ROW
  EXECUTE FUNCTION set_concepts_updated_at();

CREATE OR REPLACE FUNCTION set_qbq_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS qbq_updated_at ON question_bank_questions;
CREATE TRIGGER qbq_updated_at
  BEFORE UPDATE ON question_bank_questions
  FOR EACH ROW
  EXECUTE FUNCTION set_qbq_updated_at();
