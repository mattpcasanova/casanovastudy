-- Run once in the Supabase SQL editor for the CasanovaStudy project.
create table if not exists public.apchem_unit1_review (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  student_name  text not null,
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

-- Handy view: best attempt per student (in case someone reloads and resubmits).
create or replace view public.apchem_unit1_review_best as
select distinct on (lower(student_name), program, period)
  student_name, program, period, score, max_score, percent, created_at, seed
from public.apchem_unit1_review
order by lower(student_name), program, period, score desc, created_at desc;
