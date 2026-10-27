-- Unfinished assigned work is sent at the due date (2026-10-27). Runs now save
-- as students go, so when the due date passes, whatever a student answered is
-- turned in for them (unanswered = 0) and the teacher sees it as Incomplete.
-- An auto-sent attempt doesn't use up one of the student's attempts, so they
-- can still finish it (late) and the better score counts.

ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS auto boolean NOT NULL DEFAULT false;

-- Set once the due date has passed and unfinished runs were sent, so the sweep skips it.
ALTER TABLE practice_assignments ADD COLUMN IF NOT EXISTS auto_submitted_at timestamptz;
CREATE INDEX IF NOT EXISTS practice_assignments_due_sweep_idx ON practice_assignments(due_at) WHERE auto_submitted_at IS NULL AND due_at IS NOT NULL;
