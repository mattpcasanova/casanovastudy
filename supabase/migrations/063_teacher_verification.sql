-- Teacher verification. A teacher account can grade and make guides at once,
-- but only a verified teacher can connect to student accounts (class codes,
-- practice links, linking roster names by email). Verified = confirmed a school
-- email whose domain is on verified_school_domains, or approved by hand.
-- Written by the service role only; a teacher can read their own row.
create table if not exists public.teacher_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  method text check (method in ('domain', 'manual', 'grandfathered')),
  school_email text,
  school_name text,
  email_confirmed_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teacher_verifications enable row level security;

create policy "Teachers read their own verification" on public.teacher_verifications
  for select using (auth.uid() = user_id);

-- School email domains whose teachers are approved as soon as they confirm the address.
create table if not exists public.verified_school_domains (
  domain text primary key check (domain = lower(domain)),
  school_name text,
  created_at timestamptz not null default now()
);

alter table public.verified_school_domains enable row level security;
-- No policies: service role only.

insert into public.verified_school_domains (domain, school_name)
values ('somersetacademy.com', 'Somerset Academy')
on conflict do nothing;

-- Teachers already using classes, at the pilot school, or the e2e test account keep working.
insert into public.teacher_verifications (user_id, status, method, school_email, email_confirmed_at, decided_at)
select p.id, 'approved', 'grandfathered', u.email, now(), now()
from public.user_profiles p
join auth.users u on u.id = p.id
where p.user_type = 'teacher'
  and (split_part(lower(u.email), '@', 2) in ('somersetacademy.com', 'example.com')
       or exists (select 1 from public.classes c where c.teacher_id = p.id))
on conflict (user_id) do nothing;
