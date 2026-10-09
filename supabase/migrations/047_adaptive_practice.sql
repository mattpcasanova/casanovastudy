-- Adaptive practice (format 'adaptive'). Additive only: widens four CHECKs.
--   study_guides.format       + 'adaptive'
--   study_progress.kind       + 'adaptive'   (the student's answers, replayed by lib/adaptive/engine.ts)
--   study_results.source      + 'adaptive'   (answers feed weak spots / Progress)
--   usage_events.kind         + 'adaptive'          one per session started (free 1/week, Premium fair use)
--                             + 'adaptive_refill'   one per batch of new questions (daily safety cap)
--                             + 'adaptive_check'    one per AI-checked "explain it" answer (daily safety cap)
ALTER TABLE study_guides DROP CONSTRAINT IF EXISTS study_guides_format_check;
ALTER TABLE study_guides ADD CONSTRAINT study_guides_format_check
  CHECK (format = ANY (ARRAY['outline', 'flashcards', 'quiz', 'summary', 'custom', 'practice', 'plan', 'cheatsheet', 'timeline', 'adaptive']));

ALTER TABLE study_progress DROP CONSTRAINT IF EXISTS study_progress_kind_check;
ALTER TABLE study_progress ADD CONSTRAINT study_progress_kind_check
  CHECK (kind IN ('outline', 'plan', 'practice', 'learn', 'schedule', 'adaptive'));

ALTER TABLE study_results DROP CONSTRAINT IF EXISTS study_results_source_check;
ALTER TABLE study_results ADD CONSTRAINT study_results_source_check
  CHECK (source IN ('quiz', 'practice', 'learn', 'custom', 'adaptive'));

ALTER TABLE usage_events DROP CONSTRAINT IF EXISTS usage_events_kind_check;
ALTER TABLE usage_events ADD CONSTRAINT usage_events_kind_check
  CHECK (kind IN ('guide', 'explain', 'grading', 'adaptive', 'adaptive_refill', 'adaptive_check'));
