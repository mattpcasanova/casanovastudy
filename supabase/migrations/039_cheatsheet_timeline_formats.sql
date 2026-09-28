-- Cheat sheet and timeline formats. Additive only: widens the format CHECK.
ALTER TABLE study_guides DROP CONSTRAINT IF EXISTS study_guides_format_check;
ALTER TABLE study_guides ADD CONSTRAINT study_guides_format_check
  CHECK (format = ANY (ARRAY['outline', 'flashcards', 'quiz', 'summary', 'custom', 'practice', 'plan', 'cheatsheet', 'timeline']));
