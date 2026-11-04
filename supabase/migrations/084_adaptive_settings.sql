-- Teacher settings on assigned adaptive practice (2026-11-04). Until now every
-- assigned session ran on fixed rules (80% of the last 5 answers, the 4
-- questions per topic the guide was written with, one "explain it" question).
-- Teachers can now pick the mastery level, how many questions a topic may take
-- and whether the explain question is asked; the assign dialog shows a rough
-- time from them. Null = the old behaviour, so existing assignments don't change.

alter table public.practice_assignments
  add column if not exists mastery_pct smallint
    check (mastery_pct is null or (mastery_pct >= 50 and mastery_pct <= 100)),
  add column if not exists questions_per_concept smallint
    check (questions_per_concept is null or (questions_per_concept >= 3 and questions_per_concept <= 15)),
  add column if not exists explain_questions boolean not null default true;
