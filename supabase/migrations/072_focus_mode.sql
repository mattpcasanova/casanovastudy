-- Focus mode on assigned practice (2026-10-26): teachers asked for a way to
-- keep scores honest now that students can paste questions into AI. A web
-- page can't lock the device (that's the teacher's job: phones away), so
-- focus mode opens the work full screen, blocks copy/paste on it, and records
-- when a student leaves the page. Teachers see the log; students are told up
-- front. Writes are service role only (/api/practice-assignments/[id]/focus).

alter table public.practice_assignments
  add column if not exists focus_mode boolean not null default false;

create table if not exists public.assignment_focus_events (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.practice_assignments(id) on delete cascade,
  roster_id uuid not null references public.class_roster(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  -- start = began focus mode; left = tab/app hidden (seconds = time away);
  -- fullscreen_exit; copy / paste = blocked attempts (lib/practice/focus.ts)
  kind text not null check (kind in ('start', 'left', 'fullscreen_exit', 'copy', 'paste')),
  at timestamptz not null,
  seconds integer,
  created_at timestamptz not null default now()
);
create index if not exists assignment_focus_events_assignment_idx on public.assignment_focus_events (assignment_id, roster_id, at);
create index if not exists assignment_focus_events_student_idx on public.assignment_focus_events (student_user_id);

alter table public.assignment_focus_events enable row level security;
create policy "Teachers read focus events on their assignments" on public.assignment_focus_events
  for select using (exists (select 1 from public.practice_assignments a where a.id = assignment_id and a.teacher_id = auth.uid()));
