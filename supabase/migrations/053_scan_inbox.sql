-- Scanner inbox (2026-10-13): each teacher gets an email address
-- (grade-<token>@<INBOUND_EMAIL_DOMAIN>) they add to the school copier's
-- scan-to-email. Resend receives the mail and calls /api/inbound/scan, which
-- saves the PDF/photo attachments to the private `scan-inbox` storage bucket.
-- The batch grader lists them and the browser downloads them with short-lived
-- signed URLs (files are too big to pass through a Vercel function).
-- Service role writes everything; teachers can read their own rows.

CREATE TABLE IF NOT EXISTS grading_inboxes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scan_inbox_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_id text NOT NULL UNIQUE,
  from_address text,
  subject text,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  skipped jsonb NOT NULL DEFAULT '[]'::jsonb,
  used_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scan_inbox_items_user_idx ON scan_inbox_items (user_id, received_at DESC);

ALTER TABLE grading_inboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_inbox_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers read own inbox" ON grading_inboxes;
CREATE POLICY "Teachers read own inbox" ON grading_inboxes FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Teachers read own inbox items" ON scan_inbox_items;
CREATE POLICY "Teachers read own inbox items" ON scan_inbox_items FOR SELECT USING ((select auth.uid()) = user_id);

-- Private bucket, 100 MB per file (a 40-student class set scanned at 200 dpi).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('scan-inbox', 'scan-inbox', false, 104857600)
ON CONFLICT (id) DO NOTHING;
