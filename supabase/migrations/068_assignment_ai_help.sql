-- AI help on assigned practice (2026-10-22): a teacher saw a student paste a
-- whole assigned quiz into the Explain chat. Each assignment now sets the
-- panel to off / tutor (helps, never answers an unanswered question) / full,
-- enforced by /api/explain, and every message on assigned work is logged so
-- the teacher can see it. Students are told in the panel. Writes are service
-- role only; teachers read the log for their own assignments; students can't.

alter table public.practice_assignments
  add column if not exists ai_help text not null default 'tutor' check (ai_help in ('off', 'tutor', 'full'));

create table if not exists public.assignment_ai_uses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.practice_assignments(id) on delete cascade,
  roster_id uuid not null references public.class_roster(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  -- typed / highlight / why / first_step / check_work / figure / desmos (describeAiUse)
  kind text not null default 'typed',
  -- Typed text as sent (max 2000 chars), else the question's first line; never the photo.
  message text not null,
  -- The setting when they asked (tutor/full; off is refused, not logged).
  ai_help text not null,
  created_at timestamptz not null default now()
);
create index if not exists assignment_ai_uses_assignment_idx on public.assignment_ai_uses (assignment_id, roster_id, created_at);
create index if not exists assignment_ai_uses_student_idx on public.assignment_ai_uses (student_user_id);

alter table public.assignment_ai_uses enable row level security;
create policy "Teachers read AI use on their assignments" on public.assignment_ai_uses
  for select using (exists (select 1 from public.practice_assignments a where a.id = assignment_id and a.teacher_id = auth.uid()));
