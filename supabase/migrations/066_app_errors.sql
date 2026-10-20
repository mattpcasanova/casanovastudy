-- Error log (our own, no outside service): browser errors posted to
-- /api/errors and server errors from instrumentation.ts onRequestError.
-- Scrubbed before insert (lib/monitoring/errors.ts: no query strings, ids,
-- emails or tokens). Daily digest to ADMIN_EMAIL, rows deleted after 30 days
-- (/api/cron/error-digest). Service role only.
create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  fingerprint text not null,
  source text not null check (source in ('client', 'server')),
  message text not null,
  stack text,
  path text,
  digest text,
  user_id uuid,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.app_errors enable row level security;
-- No policies: service role only.

create index if not exists app_errors_created_idx on public.app_errors (created_at);
create index if not exists app_errors_fingerprint_idx on public.app_errors (fingerprint, created_at);
