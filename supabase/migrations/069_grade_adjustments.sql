-- Extra credit and deductions (2026-10-22): per-paper list of adjustments
-- ({id, kind extra|deduct, amount, unit percent|marks, reason, late?}; see
-- lib/grading/adjustments.ts). grade_breakdown stays as graded; total_marks,
-- percentage and grade include the adjustments.
ALTER TABLE grading_results ADD COLUMN IF NOT EXISTS adjustments jsonb NOT NULL DEFAULT '[]'::jsonb;
