-- New versions of a quiz or practice set for another attempt (2026-11-02).
-- Assigned work with attempts left gets a new version per attempt (version =
-- attempt number - 1), and a student retrying their own guide gets one per
-- "Try again". Each item tests the same skill as the original's item in the
-- same place, so the teacher's report still lines up. Written once and kept,
-- so a reload shows the same questions. Service role only (the student reads
-- it through /api/study-guides/[id]/version, which strips nothing: it's their
-- own copy of questions they are about to answer).
create table if not exists public.guide_versions (
  id uuid primary key default gen_random_uuid(),
  study_guide_id uuid not null references public.study_guides(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- null = the student's own retry; else the assignment the attempt is for
  assignment_id uuid references public.practice_assignments(id) on delete cascade,
  version int not null check (version between 1 and 50),
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  content text,
  token_usage jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists guide_versions_one
  on public.guide_versions (study_guide_id, user_id, coalesce(assignment_id, '00000000-0000-0000-0000-000000000000'::uuid), version);
create index if not exists guide_versions_user_day on public.guide_versions (user_id, created_at);

alter table public.guide_versions enable row level security;
-- No policies: only the service role (API routes) reads and writes.
