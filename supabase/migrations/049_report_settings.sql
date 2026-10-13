-- Customizable grade reports.
--
-- teacher_report_settings: a teacher's defaults for every report they print
-- (branding footer on/off, school + teacher name in the header, which parts
-- show, the default grade scale and exam-board marking style). Kept off
-- user_profiles because profile identity columns are locked (048) and these
-- are plain preferences. Owner-only RLS; the API writes with the service role.
--
-- grading_results gets a snapshot of the scale and marking style used, so a
-- report keeps its grade if the teacher's defaults change later. Totals become
-- numeric because the grader allows half marks (2.5/3).

CREATE TABLE IF NOT EXISTS teacher_report_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  show_branding boolean NOT NULL DEFAULT true,
  school_name text,
  teacher_name text,
  show_percentage boolean NOT NULL DEFAULT true,
  show_grade boolean NOT NULL DEFAULT true,
  show_feedback boolean NOT NULL DEFAULT true,
  show_mark_codes boolean NOT NULL DEFAULT true,
  show_levels boolean NOT NULL DEFAULT true,
  show_ao boolean NOT NULL DEFAULT true,
  default_scale jsonb,
  marking_style jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE teacher_report_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers read own report settings" ON teacher_report_settings;
CREATE POLICY "Teachers read own report settings" ON teacher_report_settings
  FOR SELECT USING ((select auth.uid()) = user_id);

ALTER TABLE grading_results ADD COLUMN IF NOT EXISTS grade_scale jsonb;
ALTER TABLE grading_results ADD COLUMN IF NOT EXISTS marking_style jsonb;

ALTER TABLE grading_results ALTER COLUMN total_marks TYPE numeric USING total_marks::numeric;
ALTER TABLE grading_results ALTER COLUMN total_possible_marks TYPE numeric USING total_possible_marks::numeric;
