-- Add an optional comment field to student submissions so students can
-- include context for their teacher (e.g. "skipped Q3, came back to it").
ALTER TABLE assignment_submissions
  ADD COLUMN IF NOT EXISTS student_comment TEXT;
