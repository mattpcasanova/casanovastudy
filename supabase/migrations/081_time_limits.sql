-- Time limits on assigned practice (2026-10-30). Teachers can give a quiz or
-- practice set a time limit, like Canvas and Schoology quizzes: the student
-- sees a countdown that starts when they press Start, the run is handed in
-- when it reaches zero, and the teacher sees how long each attempt took.
-- Adaptive practice has no fixed length, so it takes no limit.

alter table public.practice_assignments
  add column if not exists time_limit_seconds integer
  check (time_limit_seconds is null or (time_limit_seconds >= 60 and time_limit_seconds <= 14400));

-- How long the run took, as the student's browser measured it (null for runs
-- sent at the due date and for attempts from before this column).
alter table public.practice_attempts
  add column if not exists seconds integer
  check (seconds is null or seconds >= 0);
