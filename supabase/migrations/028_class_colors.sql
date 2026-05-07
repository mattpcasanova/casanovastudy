-- Phase 4: per-class color tokens.
-- Teachers pick a default color when they create/edit a class. Each enrolled
-- student can override the color for their personal view (e.g., a student
-- prefers blue for AP Stats even though their teacher chose red).
--
-- Color is stored as a small token string ("blue", "rose", etc.). The UI maps
-- tokens to Tailwind classes so we can change palette without DB churn.

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS color TEXT;

ALTER TABLE class_enrollments
  ADD COLUMN IF NOT EXISTS student_color TEXT;
