-- Baseline capture of schema drift: these columns exist in production
-- (applied directly via Dashboard/MCP as the missing migrations 012 and 027)
-- but were never recorded as migration files. Idempotent — a no-op on prod.

-- Per-assignment grading visibility flags (missing migration 027)
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS auto_grade BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS students_can_see_grade BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS students_can_see_report BOOLEAN NOT NULL DEFAULT TRUE;

-- Teacher-level default preferences for the above (missing migration 012)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS pref_auto_grade BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pref_students_can_see_grade BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pref_students_can_see_report BOOLEAN NOT NULL DEFAULT TRUE;
