-- Run once in the Supabase SQL editor for the CasanovaStudy project.
create table if not exists public.apchem_unit1_review (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  student_name  text not null,
  first_name    text,
  last_name     text,
  program       text not null check (program in ('HS','AC')),
  period        text not null,
  seed          bigint not null,
  score         numeric not null,
  max_score     numeric not null,
  percent       numeric generated always as (round(score / max_score * 100, 1)) stored,
  answers       jsonb not null default '{}'::jsonb,
  user_agent    text
);

-- Lock it down: the API route uses the service-role key, which bypasses RLS,
-- so no policies are needed and the anon key cannot read or write this table.
alter table public.apchem_unit1_review enable row level security;

create index if not exists apchem_unit1_review_period_idx on public.apchem_unit1_review (program, period, created_at desc);
create index if not exists apchem_unit1_review_name_idx on public.apchem_unit1_review (program, last_name, first_name);

-- Handy view: best attempt per student (in case someone reloads and resubmits),
-- sorted the way grading happens: by program, then period, then last name.
create or replace view public.apchem_unit1_review_best as
select distinct on (program, period, lower(coalesce(last_name,'')), lower(coalesce(first_name, student_name)))
  last_name, first_name, student_name, program, period, score, max_score, percent, created_at, seed
from public.apchem_unit1_review
order by program, period, lower(coalesce(last_name,'')), lower(coalesce(first_name, student_name)), score desc, created_at desc;
