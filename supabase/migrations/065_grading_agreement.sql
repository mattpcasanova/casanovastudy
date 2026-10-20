-- How often teachers keep the AI's marks. ai_breakdown is the breakdown as the
-- grader first saved it (set on insert, never edited); reviewed_at is when the
-- teacher last edited or finished checking the report. Only rows graded after
-- this migration have ai_breakdown: older edits can't be told apart, so they
-- aren't counted. See lib/grading/agreement.ts.
alter table public.grading_results add column if not exists ai_breakdown jsonb;
alter table public.grading_results add column if not exists reviewed_at timestamptz;
