-- Standards a guide is written to (lib/standards.ts): free text typed by the
-- teacher or parent (codes such as MA.8.AR.2.1 and/or the standard's wording).
-- Shown above the guide and on the printout; null = none.
ALTER TABLE study_guides ADD COLUMN IF NOT EXISTS standards text
  CHECK (standards IS NULL OR char_length(standards) <= 600);
