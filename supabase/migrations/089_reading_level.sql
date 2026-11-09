-- "Copy at an easier reading level" (lib/study-options.ts READING_LEVELS): the
-- copy is a new guide with translation_of = the original (same items, same
-- answers) and its reading level here; null = written at the request's level.
ALTER TABLE study_guides ADD COLUMN IF NOT EXISTS reading_level text
  CHECK (reading_level IS NULL OR reading_level IN ('grade2', 'grade4', 'grade6', 'grade8'));
