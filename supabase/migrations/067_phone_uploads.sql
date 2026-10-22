-- Send from your phone (2026-10-22): the batch grader shows a QR code; the
-- phone opens /phone/<token> (no sign-in, the token is the key) and uploads
-- page photos straight to the private `scan-inbox` bucket with signed upload
-- links. Each send becomes a scan_inbox_items row, so the laptop picks it up
-- like a copier scan. Tokens are stored as SHA-256 and expire after 2 hours.
-- Service role only (no policies).

CREATE TABLE IF NOT EXISTS phone_upload_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  opened_at timestamptz,
  files_signed integer NOT NULL DEFAULT 0,
  sends integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phone_upload_sessions_user_idx ON phone_upload_sessions (user_id, created_at DESC);
ALTER TABLE phone_upload_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE scan_inbox_items
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'email' CHECK (source IN ('email', 'phone')),
  ADD COLUMN IF NOT EXISTS phone_session_id uuid REFERENCES phone_upload_sessions(id) ON DELETE SET NULL;
