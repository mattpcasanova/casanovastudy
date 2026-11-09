-- Standards picked from the Florida list come with their official wording
-- ("MA.8.AR.3.2: Given a table, graph or written description..."), so a few
-- of them need more than 600 characters.
ALTER TABLE study_guides DROP CONSTRAINT IF EXISTS study_guides_standards_check;
ALTER TABLE study_guides ADD CONSTRAINT study_guides_standards_check CHECK (standards IS NULL OR char_length(standards) <= 1500);
ALTER TABLE grading_batches DROP CONSTRAINT IF EXISTS grading_batches_standards_check;
ALTER TABLE grading_batches ADD CONSTRAINT grading_batches_standards_check CHECK (standards IS NULL OR char_length(standards) <= 1500);
