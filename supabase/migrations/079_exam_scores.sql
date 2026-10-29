-- A student's stated test scores (2026-10-28). When a request says "I got a
-- 630 on the SAT" the guide prompt writes at and above that level (lib/exams);
-- the score is kept here so every later guide for that test uses it without
-- the student retyping it. Keyed by exam profile id:
--   { "sat-math": { "current": 630, "target": 800, "at": "2026-10-28T..." } }
-- Written by API routes with the service role; the owner can read it.

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS exam_scores jsonb;
