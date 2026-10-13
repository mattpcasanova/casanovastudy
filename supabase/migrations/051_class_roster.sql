-- Light classes: a roster of names per class (2026-10-13).
--
-- Names come first: a teacher pastes their class list (or saves the names from
-- a graded stack) and grading matches handwriting against it. Students don't
-- need accounts; when one joins with the class code they are linked to their
-- roster name (student_user_id).
--
-- grading_results gains the class and roster row it was graded for, and a
-- `released` flag: batch gradings start unreleased and the teacher releases a
-- whole batch to linked students. Existing rows stay visible (default true).

CREATE TABLE IF NOT EXISTS class_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  student_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS class_roster_name_key
  ON class_roster (class_id, lower(trim(first_name || ' ' || last_name)));
CREATE UNIQUE INDEX IF NOT EXISTS class_roster_student_key
  ON class_roster (class_id, student_user_id) WHERE student_user_id IS NOT NULL;

ALTER TABLE class_roster ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers manage own class rosters" ON class_roster;
CREATE POLICY "Teachers manage own class rosters" ON class_roster
  FOR ALL
  USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = class_roster.class_id AND classes.teacher_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM classes WHERE classes.id = class_roster.class_id AND classes.teacher_id = (select auth.uid())));

DROP POLICY IF EXISTS "Students read own roster rows" ON class_roster;
CREATE POLICY "Students read own roster rows" ON class_roster
  FOR SELECT USING ((select auth.uid()) = student_user_id);

ALTER TABLE grading_results ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE grading_results ADD COLUMN IF NOT EXISTS roster_id uuid REFERENCES class_roster(id) ON DELETE SET NULL;
ALTER TABLE grading_results ADD COLUMN IF NOT EXISTS released boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS grading_results_class_id_idx ON grading_results (class_id) WHERE class_id IS NOT NULL;

-- Students only see a report once the teacher releases it.
DROP POLICY IF EXISTS "Students can view their grade reports" ON grading_results;
CREATE POLICY "Students can view their grade reports" ON grading_results
  FOR SELECT USING ((select auth.uid()) = user_id OR ((select auth.uid()) = student_user_id AND released));
