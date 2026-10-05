-- Review reminder settings, one row per user. No row = reminders on (default).
-- Students switch email reminders on/off from /account (browser, own row) or
-- the signed unsubscribe link (service role). last_sent_at is written by the
-- daily job (service role) so nobody gets two reminders in a day.
CREATE TABLE IF NOT EXISTS reminder_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT true,
  last_sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reminder_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own reminder prefs" ON reminder_prefs FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users insert own reminder prefs" ON reminder_prefs FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users update own reminder prefs" ON reminder_prefs FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
