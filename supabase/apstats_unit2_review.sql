-- AP Stats Unit 2 Group Review. Run once in the CasanovaStudy Supabase project.
-- One row per student; group members share a group_id and a score.
create table if not exists public.apstats_unit2_review (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  group_id        uuid not null,
  program         text not null check (program in ('HS','AC')),
  period          text not null,
  group_name      text not null,
  first_name      text not null,
  last_name       text not null,
  seed            bigint not null,
  score           numeric not null,
  max_score       numeric not null,
  percent         numeric generated always as (round(score / max_score * 100, 1)) stored,
  section_scores  jsonb not null default '{}'::jsonb,
  answers         jsonb not null default '{}'::jsonb,
  user_agent      text
);

-- The API route uses the service-role key (bypasses RLS); the anon key gets nothing.
alter table public.apstats_unit2_review enable row level security;

-- Gradebook order: school, then period, then last name A-Z.
create index if not exists apstats_unit2_review_gradebook_idx
  on public.apstats_unit2_review (program, period, lower(last_name), lower(first_name));

-- Best attempt per student, in case a group resubmits under a new group name.
create or replace view public.apstats_unit2_review_best as
select distinct on (program, period, lower(last_name), lower(first_name))
  created_at, group_id, program, period, group_name, first_name, last_name, seed, score, max_score, percent
from public.apstats_unit2_review
order by program, period, lower(last_name), lower(first_name), score desc, created_at desc;

-- In-progress work, so a group can leave and come back on any device. One row per period + group name.
create table if not exists public.apstats_unit2_review_draft (
  period      text not null,
  group_key   text not null,          -- lowercased, whitespace-collapsed group name
  group_name  text not null,
  members     jsonb not null default '[]'::jsonb,
  state       jsonb not null default '{}'::jsonb,
  submitted   boolean not null default false,
  result      jsonb,
  updated_at  timestamptz not null default now(),
  primary key (period, group_key)
);
alter table public.apstats_unit2_review_draft enable row level security;
