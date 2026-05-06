-- Phase 3 of the teacher-side overhaul: study_guide_assignments join table.
-- Replaces the legacy free-text class_name column with a real many-to-many
-- link from study_guides to classes. Teachers can assign a guide to one or
-- many classes; students see assigned guides on their class page.

CREATE TABLE IF NOT EXISTS study_guide_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_guide_id UUID NOT NULL REFERENCES study_guides(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(study_guide_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_sga_study_guide ON study_guide_assignments(study_guide_id);
CREATE INDEX IF NOT EXISTS idx_sga_class ON study_guide_assignments(class_id);

ALTER TABLE study_guide_assignments ENABLE ROW LEVEL SECURITY;

-- Teachers can view assignments for classes they own
CREATE POLICY "Teachers can view sga for own classes" ON study_guide_assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid())
  );

-- Students can view assignments for classes they are actively enrolled in
CREATE POLICY "Students can view sga for enrolled classes" ON study_guide_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE class_id = study_guide_assignments.class_id
        AND student_id = auth.uid()
        AND status = 'active'
    )
  );

-- Teachers can assign guides to their own classes
CREATE POLICY "Teachers can insert sga for own classes" ON study_guide_assignments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid())
  );

-- Teachers can unassign guides from their own classes
CREATE POLICY "Teachers can delete sga for own classes" ON study_guide_assignments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid())
  );
