-- Lock the profile fields that decide consent (COPPA) and permissions.
-- Users can update their own user_profiles row (RLS), so without this a
-- student could switch to "teacher", rewrite their birth date or set a
-- clever_id (= school consent) and skip a parent's approval.
--
-- From the browser (roles anon/authenticated):
--   * user_type can't change after sign-up
--   * birth_date can't change once set (filling a missing one goes through
--     /api/consent, which runs as the service role)
--   * clever_id can't be set or changed (only the Clever SSO route sets it)
-- For everyone: a teacher account must be 18+ when a birth date is known.
-- The service role (API routes, scripts) and the dashboard are unaffected
-- apart from the 18+ rule.

create or replace function public.guard_profile_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.user_type = 'teacher'
     and new.birth_date is not null
     and new.birth_date > (current_date - interval '18 years') then
    raise exception 'Teacher accounts are for adults (18+).' using errcode = 'check_violation';
  end if;

  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if new.clever_id is not null then
        raise exception 'clever_id can only be set by school sign-in.' using errcode = 'insufficient_privilege';
      end if;
    else
      if new.user_type is distinct from old.user_type then
        raise exception 'Account type can''t be changed.' using errcode = 'insufficient_privilege';
      end if;
      if old.birth_date is not null and new.birth_date is distinct from old.birth_date then
        raise exception 'Birth date can''t be changed.' using errcode = 'insufficient_privilege';
      end if;
      if new.clever_id is distinct from old.clever_id then
        raise exception 'clever_id can only be set by school sign-in.' using errcode = 'insufficient_privilege';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_identity on public.user_profiles;
create trigger guard_profile_identity
  before insert or update on public.user_profiles
  for each row execute function public.guard_profile_identity();
