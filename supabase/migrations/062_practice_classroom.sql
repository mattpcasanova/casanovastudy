-- Assigned practice posted to Google Classroom: the Classroom assignment's
-- link, and when scores were last sent back to it.
alter table public.practice_assignments add column if not exists classroom_link text;
alter table public.practice_assignments add column if not exists classroom_synced_at timestamptz;
