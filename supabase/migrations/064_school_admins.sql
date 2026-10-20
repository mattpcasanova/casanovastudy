-- School admins (a principal or department head): see their school's teacher
-- activity at /school. A school is a verified email domain; its teachers are
-- the approved ones whose confirmed school email is on that domain. Admins
-- see counts per teacher, never student names. Service role writes (scripts/teachers.ts).
create table if not exists public.school_admins (
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null references public.verified_school_domains(domain) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, domain)
);

alter table public.school_admins enable row level security;

create policy "Admins read their own rows" on public.school_admins
  for select using (auth.uid() = user_id);
