-- Study plans: a 'plan' guide breaks a big goal into units; guides generated
-- from a unit point back to the plan. Additive only.
ALTER TABLE study_guides DROP CONSTRAINT IF EXISTS study_guides_format_check;
ALTER TABLE study_guides ADD CONSTRAINT study_guides_format_check
  CHECK (format = ANY (ARRAY['outline', 'flashcards', 'quiz', 'summary', 'custom', 'practice', 'plan']));

ALTER TABLE study_guides
  ADD COLUMN IF NOT EXISTS parent_guide_id uuid REFERENCES study_guides(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_unit text;

CREATE INDEX IF NOT EXISTS study_guides_parent_guide_id_idx ON study_guides (parent_guide_id);
