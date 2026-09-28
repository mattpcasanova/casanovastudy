-- Add the interactive "practice" study-guide format (matching, fill-in-the-blank,
-- ordering, sorting, and multiple-choice activities). Additive: existing rows are
-- unaffected.
ALTER TABLE study_guides DROP CONSTRAINT IF EXISTS study_guides_format_check;
ALTER TABLE study_guides ADD CONSTRAINT study_guides_format_check
  CHECK (format = ANY (ARRAY['outline', 'flashcards', 'quiz', 'summary', 'custom', 'practice']));
