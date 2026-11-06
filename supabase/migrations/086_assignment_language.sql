-- A student can get assigned practice in another language (set by the teacher
-- on the assignment page). The assignment, its questions' positions and the
-- score stay the same; the student is served the guide's translation.
--   practice_assignment_students.language: null = the guide's own language.
--   study_guides.translation_of: the guide a "Copy in another language" was made from.
ALTER TABLE practice_assignment_students ADD COLUMN IF NOT EXISTS language text
  CHECK (language IS NULL OR language IN ('en', 'es', 'en-es', 'ht', 'pt', 'fr'));
ALTER TABLE study_guides ADD COLUMN IF NOT EXISTS translation_of uuid REFERENCES study_guides(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS study_guides_translation_of_idx ON study_guides(translation_of) WHERE translation_of IS NOT NULL;
