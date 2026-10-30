-- Data retention (2026-10-30): the privacy policy now states how long each
-- kind of information is kept, and /api/cron/retention (lib/retention/run.ts)
-- enforces it daily. Periods live in lib/retention/rules.ts.
--
-- 1. Which inactive accounts we've warned about deletion (one row per user;
--    the row goes when the account does, or when the user comes back).
create table if not exists public.account_retention_notices (
  user_id uuid primary key references auth.users(id) on delete cascade,
  warned_at timestamptz not null default now(),
  last_active_at timestamptz,
  delete_after timestamptz not null
);
alter table public.account_retention_notices enable row level security;
-- Service role only: no policies for anon/authenticated.

-- 2. Files in the private uploads bucket older than a date, by kind (the second
--    path segment: <user id>/<kind>/<file>). storage.objects isn't reachable
--    through PostgREST, so the job calls this; service role only.
create or replace function public.old_uploads(p_kind text, p_before timestamptz, p_limit integer default 500)
returns table (name text)
language sql
security definer
set search_path = public, storage
as $$
  select o.name
  from storage.objects o
  where o.bucket_id = 'uploads'
    and split_part(o.name, '/', 2) = p_kind
    and o.created_at < p_before
  order by o.created_at
  limit greatest(1, least(p_limit, 1000));
$$;
revoke all on function public.old_uploads(text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.old_uploads(text, timestamptz, integer) to service_role;
