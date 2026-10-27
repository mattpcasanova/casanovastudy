-- Assigned practice that remembers (2026-10-27). Students started an assigned
-- practice in class and lost every answer when they came back for homework:
-- quiz and practice runs lived only in the page, and students who had pressed
-- "Save to My Guides" reopened their copy, which isn't the assigned guide.
--
-- 1. Quiz runs in progress are saved like practice runs (study_progress kind 'quiz').
-- 2. study_guides.copied_from: which guide a "Save to My Guides" copy came from,
--    so a copy of an assigned guide can send the student back to the assignment
--    and My Guides can say where a guide came from.

ALTER TABLE study_progress DROP CONSTRAINT IF EXISTS study_progress_kind_check;
ALTER TABLE study_progress ADD CONSTRAINT study_progress_kind_check
  CHECK (kind IN ('outline', 'plan', 'practice', 'quiz', 'learn', 'schedule', 'adaptive'));

ALTER TABLE study_guides ADD COLUMN IF NOT EXISTS copied_from uuid REFERENCES study_guides(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS study_guides_copied_from_idx ON study_guides(copied_from) WHERE copied_from IS NOT NULL;

-- Backfill: a copy (no token_usage: nothing was generated) points at the oldest
-- earlier guide by someone else with the same title, format and content.
UPDATE study_guides c
SET copied_from = (
  SELECT g.id FROM study_guides g
  WHERE g.title = c.title AND g.format = c.format
    AND md5(coalesce(g.content, '') || coalesce(g.custom_content::text, '')) = md5(coalesce(c.content, '') || coalesce(c.custom_content::text, ''))
    AND g.user_id <> c.user_id AND g.created_at < c.created_at
  ORDER BY g.created_at
  LIMIT 1
)
WHERE c.token_usage IS NULL AND c.copied_from IS NULL;
