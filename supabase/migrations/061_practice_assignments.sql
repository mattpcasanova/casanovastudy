-- Practice a teacher assigns to some students of a class (a reteach group,
-- an area, or anyone): one of the teacher's own guides (quiz, practice or
-- adaptive), an optional due date and attempt limit. Students open it from a
-- share link (/practice/<code>) or a Google Classroom post; each finished run
-- is an attempt. All writes go through API routes (service role).
create table if not exists public.practice_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  study_guide_id uuid not null references public.study_guides(id) on delete cascade,
  title text not null,
  grading text not null check (grading in ('percent', 'mastery')),
  max_attempts int check (max_attempts is null or max_attempts between 1 and 20),
  due_at timestamptz,
  code text not null unique,
  -- Where it came from, e.g. {"batchId": "...", "groupKey": "reteach:Normal"}.
  source jsonb,
  classroom_course_id text,
  classroom_work_id text,
  created_at timestamptz not null default now()
);
create index if not exists practice_assignments_class_idx on public.practice_assignments (class_id);
create index if not exists practice_assignments_teacher_idx on public.practice_assignments (teacher_id);

create table if not exists public.practice_assignment_students (
  assignment_id uuid not null references public.practice_assignments(id) on delete cascade,
  roster_id uuid not null references public.class_roster(id) on delete cascade,
  primary key (assignment_id, roster_id)
);

create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.practice_assignments(id) on delete cascade,
  roster_id uuid not null references public.class_roster(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  correct numeric not null,
  total numeric not null,
  pct numeric not null,
  -- Adaptive: {"mastered": 3, "concepts": 5, "names": [...]}
  detail jsonb,
  -- false once the attempt limit was used up (kept, but not graded)
  counted boolean not null default true,
  finished_at timestamptz not null default now()
);
create index if not exists practice_attempts_assignment_idx on public.practice_attempts (assignment_id, roster_id);

-- How a student got linked to their roster name from a share link (teacher can check).
alter table public.class_roster add column if not exists linked_via text;

alter table public.practice_assignments enable row level security;
alter table public.practice_assignment_students enable row level security;
alter table public.practice_attempts enable row level security;

create policy "Teachers read their assignments" on public.practice_assignments
  for select using (auth.uid() = teacher_id);
create policy "Teachers read who they assigned" on public.practice_assignment_students
  for select using (exists (select 1 from public.practice_assignments a where a.id = assignment_id and a.teacher_id = auth.uid()));
create policy "Teachers read attempts on their assignments" on public.practice_attempts
  for select using (exists (select 1 from public.practice_assignments a where a.id = assignment_id and a.teacher_id = auth.uid()));
create policy "Students read their own attempts" on public.practice_attempts
  for select using (auth.uid() = student_user_id);
