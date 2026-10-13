-- School years, courses and students who left (2026-10-13).
--
-- classes.school_year: "2026-27" style; school years start July 1. New
-- classes get the current one by default (every create path), existing
-- classes are backfilled from when they were made.
-- classes.course: what the class teaches (e.g. "AP Chemistry"), linking the
-- same course across periods and years for the course view. Null means "use
-- the class name without its period" (lib/classes/years.ts courseKey).
-- class_roster.left_at: a student who left mid-year; hidden by default but
-- their graded work stays.

CREATE OR REPLACE FUNCTION public.cs_school_year(ts timestamptz)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN extract(month FROM ts AT TIME ZONE 'America/New_York') >= 7
      THEN extract(year FROM ts AT TIME ZONE 'America/New_York')::int::text || '-' || lpad(((extract(year FROM ts AT TIME ZONE 'America/New_York')::int + 1) % 100)::text, 2, '0')
    ELSE (extract(year FROM ts AT TIME ZONE 'America/New_York')::int - 1)::text || '-' || lpad((extract(year FROM ts AT TIME ZONE 'America/New_York')::int % 100)::text, 2, '0')
  END
$$;

ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_year text;
UPDATE classes SET school_year = public.cs_school_year(created_at) WHERE school_year IS NULL;
ALTER TABLE classes ALTER COLUMN school_year SET DEFAULT public.cs_school_year(now());
ALTER TABLE classes ALTER COLUMN school_year SET NOT NULL;
CREATE INDEX IF NOT EXISTS classes_teacher_year_idx ON classes (teacher_id, school_year);

ALTER TABLE classes ADD COLUMN IF NOT EXISTS course text;

ALTER TABLE class_roster ADD COLUMN IF NOT EXISTS left_at timestamptz;
