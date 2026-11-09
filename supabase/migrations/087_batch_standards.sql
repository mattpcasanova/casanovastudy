-- Standards a graded class set assesses (lib/standards.ts): free text typed by
-- the teacher (codes such as MA.8.AR.2.1). With two or more codes the class
-- report groups the questions by standard instead of by topic. null = none.
ALTER TABLE grading_batches ADD COLUMN IF NOT EXISTS standards text
  CHECK (standards IS NULL OR char_length(standards) <= 600);
