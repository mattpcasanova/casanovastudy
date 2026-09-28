-- Study plans can store a test-date schedule. Additive only: widens the kind CHECK.
ALTER TABLE study_progress DROP CONSTRAINT IF EXISTS study_progress_kind_check;
ALTER TABLE study_progress ADD CONSTRAINT study_progress_kind_check
  CHECK (kind IN ('outline', 'plan', 'practice', 'learn', 'schedule'));
