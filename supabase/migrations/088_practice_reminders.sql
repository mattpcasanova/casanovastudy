-- Reminders for assigned practice (lib/practice/reminders.ts): the day before
-- it is due, a student who hasn't finished gets one email, and the teacher gets
-- one summary. Each is sent once; these record when.
ALTER TABLE practice_assignment_students ADD COLUMN IF NOT EXISTS reminded_at timestamptz;
ALTER TABLE practice_assignments ADD COLUMN IF NOT EXISTS teacher_reminded_at timestamptz;
