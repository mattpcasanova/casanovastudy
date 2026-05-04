-- Phase 2 of the teacher-side overhaul: assignments + submissions.
-- Assignments are posted by a teacher and can be linked to multiple classes via
-- assignment_class_links. Each enrolled student submits at most one submission
-- per assignment (resubmits overwrite the row + file_urls).
--
-- See plan: ~/.claude/plans/i-made-this-site-enumerated-dove.md

-- =============================================================================
-- TABLE: assignments
-- =============================================================================
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMP WITH TIME ZONE,
  mark_scheme_url TEXT,
  mark_scheme_text TEXT,
  grading_instructions TEXT,
  total_possible_marks INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_at ON assignments(due_at);

-- =============================================================================
-- TABLE: assignment_class_links
-- One assignment can be posted to many classes (AP Stats P1, P3, P5).
-- =============================================================================
CREATE TABLE IF NOT EXISTS assignment_class_links (
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (assignment_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_class_links_class ON assignment_class_links(class_id);

-- =============================================================================
-- TABLE: assignment_submissions
-- One submission per (assignment, student). Resubmits overwrite via UPDATE.
-- =============================================================================
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  file_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'grading', 'pending_review', 'graded', 'failed')),
  is_late BOOLEAN NOT NULL DEFAULT FALSE,
  grading_result_id UUID REFERENCES grading_results(id) ON DELETE SET NULL,
  grading_error TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_class ON assignment_submissions(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON assignment_submissions(assignment_id, status);

-- =============================================================================
-- Link grading_results back to the submission that produced it (nullable, since
-- the standalone /grade-exam flow still creates grading_results without an
-- assignment context).
-- =============================================================================
ALTER TABLE grading_results
  ADD COLUMN IF NOT EXISTS assignment_submission_id UUID
  REFERENCES assignment_submissions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_grading_results_submission
  ON grading_results(assignment_submission_id);

-- =============================================================================
-- RLS: assignments
-- Teachers manage their own. Students see assignments linked to a class they
-- are actively enrolled in.
-- =============================================================================
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own assignments (select)" ON assignments
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers manage own assignments (insert)" ON assignments
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers manage own assignments (update)" ON assignments
  FOR UPDATE USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers manage own assignments (delete)" ON assignments
  FOR DELETE USING (auth.uid() = teacher_id);

CREATE POLICY "Students view assignments via enrolled class" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignment_class_links acl
      JOIN class_enrollments ce ON ce.class_id = acl.class_id
      WHERE acl.assignment_id = assignments.id
        AND ce.student_id = auth.uid()
        AND ce.status = 'active'
    )
  );

-- =============================================================================
-- RLS: assignment_class_links
-- Teacher manages links for their own assignments. Students can see links for
-- classes they are enrolled in (enables: "show me assignments for this class").
-- =============================================================================
ALTER TABLE assignment_class_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own assignment links (select)" ON assignment_class_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_class_links.assignment_id
        AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers manage own assignment links (insert)" ON assignment_class_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_class_links.assignment_id
        AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers manage own assignment links (delete)" ON assignment_class_links
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_class_links.assignment_id
        AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students view links for enrolled classes" ON assignment_class_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_enrollments ce
      WHERE ce.class_id = assignment_class_links.class_id
        AND ce.student_id = auth.uid()
        AND ce.status = 'active'
    )
  );

-- =============================================================================
-- RLS: assignment_submissions
-- Students manage their own submissions. Teachers see/update submissions for
-- assignments they own.
-- =============================================================================
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own submissions" ON assignment_submissions
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students insert own submissions" ON assignment_submissions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students update own submissions" ON assignment_submissions
  FOR UPDATE USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers view submissions on own assignments" ON assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_submissions.assignment_id
        AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers update submissions on own assignments" ON assignment_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_submissions.assignment_id
        AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers delete submissions on own assignments" ON assignment_submissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_submissions.assignment_id
        AND a.teacher_id = auth.uid()
    )
  );

-- =============================================================================
-- updated_at triggers
-- =============================================================================
CREATE OR REPLACE FUNCTION set_assignments_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS assignments_updated_at ON assignments;
CREATE TRIGGER assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION set_assignments_updated_at();

CREATE OR REPLACE FUNCTION set_submissions_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS submissions_updated_at ON assignment_submissions;
CREATE TRIGGER submissions_updated_at
  BEFORE UPDATE ON assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION set_submissions_updated_at();
