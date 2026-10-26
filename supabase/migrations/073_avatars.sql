-- Profile avatars (2026-10-26): students asked to change their avatar. Preset
-- choices only (an icon + a color, "cat:violet"; components/profile/avatar.tsx),
-- so nothing uploaded. Users set their own through the normal profile UPDATE
-- policy; the value is checked against the preset shape.
alter table public.user_profiles
  add column if not exists avatar text check (avatar is null or avatar ~ '^[a-z0-9-]{1,20}:[a-z]{1,12}$');
