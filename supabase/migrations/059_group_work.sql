-- Group work (2026-10-13): one paper written by several students is graded
-- once and saved as a report for each member. group_id ties the members'
-- rows together (edits can apply to the whole group); group_members lists
-- everyone ([{ name, rosterId }]) for the report header.

ALTER TABLE grading_results ADD COLUMN IF NOT EXISTS group_id uuid;
ALTER TABLE grading_results ADD COLUMN IF NOT EXISTS group_members jsonb;
CREATE INDEX IF NOT EXISTS grading_results_group_idx ON grading_results (group_id) WHERE group_id IS NOT NULL;
