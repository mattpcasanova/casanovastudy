-- Google Classroom roster import (2026-10-13).
-- classes.google_course_id: the Classroom course a class came from, so a
-- re-import updates it instead of making a duplicate.
-- class_roster.email: the student's school email (from Classroom); a roster
-- name is linked to the account with that email automatically.
-- google_classroom_tokens: a teacher's short-lived (1 hour) read-only access
-- token between connecting and importing. Service role only (no policies);
-- deleted after the import.

ALTER TABLE classes ADD COLUMN IF NOT EXISTS google_course_id text;
CREATE UNIQUE INDEX IF NOT EXISTS classes_google_course_key ON classes (teacher_id, google_course_id) WHERE google_course_id IS NOT NULL;

ALTER TABLE class_roster ADD COLUMN IF NOT EXISTS email text;

CREATE TABLE IF NOT EXISTS google_classroom_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  expires_at timestamptz NOT NULL
);
ALTER TABLE google_classroom_tokens ENABLE ROW LEVEL SECURITY;
