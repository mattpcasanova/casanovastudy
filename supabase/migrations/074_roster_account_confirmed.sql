-- "Yes, that's them" (2026-10-26): a linked account whose own name doesn't look
-- like the roster name shows an amber "Signed in as X. Is that Y?" row on the
-- class page and the assigned-practice list, which only offered "Not them".
-- A student who signed up with a nickname or a different spelling is still the
-- right person; the teacher confirms it once and the warning stops. Cleared
-- whenever the name is unlinked, so it never applies to a later account.
alter table public.class_roster
  add column if not exists account_confirmed_at timestamptz;
