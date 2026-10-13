-- Class imports and "no paper" statuses (2026-10-13).
--
-- class_roster.student_number: the school's student ID from a gradebook
-- export (optional; shown on exports and, later, stamped test pages).
--
-- batch_student_status: for a graded class set, what happened to roster
-- students with no paper: absent, missing, exempt (left out of averages) or
-- late (a missing paper that was graded later). Written by the API with the
-- service role; the teacher who owns the batch can read their rows.

ALTER TABLE class_roster ADD COLUMN IF NOT EXISTS student_number text;

CREATE TABLE IF NOT EXISTS batch_student_status (
  batch_id uuid NOT NULL,
  roster_id uuid NOT NULL REFERENCES class_roster(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('absent', 'missing', 'exempt', 'late')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (batch_id, roster_id)
);

ALTER TABLE batch_student_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers read own batch statuses" ON batch_student_status;
CREATE POLICY "Teachers read own batch statuses" ON batch_student_status
  FOR SELECT USING ((select auth.uid()) = user_id);
