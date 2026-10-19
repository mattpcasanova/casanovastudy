-- One row per graded class set: what's needed to add more papers later with
-- the same marking (the mark scheme or checked answer key, notes) and where
-- the work came from (a Google Classroom assignment). Written by the service
-- role from /api/grade-batch/paper; the teacher can read their own.
create table if not exists public.grading_batches (
  batch_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mark_scheme jsonb,
  notes text,
  classroom_course_id text,
  classroom_work_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.grading_batches enable row level security;

create policy "Teachers read their own class sets" on public.grading_batches
  for select using (auth.uid() = user_id);

create index if not exists grading_batches_user_idx on public.grading_batches (user_id);
