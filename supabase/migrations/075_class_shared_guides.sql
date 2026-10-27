-- Share with a class (2026-10-26): a teacher gives a guide of any format to a
-- class with no grading (Assign only covers quiz/practice/adaptive, so a cheat
-- sheet or outline had no way to reach students except a pasted link). Shows
-- on the students' My Classes page and the homepage strip. Service role
-- writes; the teacher can read their own rows.
create table if not exists public.class_shared_guides (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  study_guide_id uuid not null references public.study_guides(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (class_id, study_guide_id)
);
create index if not exists class_shared_guides_class_idx on public.class_shared_guides(class_id, created_at desc);
alter table public.class_shared_guides enable row level security;
drop policy if exists "teacher reads own shares" on public.class_shared_guides;
create policy "teacher reads own shares" on public.class_shared_guides for select using (auth.uid() = teacher_id);
