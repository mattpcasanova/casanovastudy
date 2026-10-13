-- Overall comment a teacher writes on a grade report (shown and printed for the
-- student). Separate from additional_comments, which holds the teacher's
-- grading instructions to the AI and is never shown on the report.
ALTER TABLE grading_results ADD COLUMN IF NOT EXISTS teacher_comment text;
