-- Name-stamped tests (2026-10-13): a teacher uploads a blank test and prints
-- one copy per student with the student's name, "page p of n" and a QR code on
-- every page (stamped in the browser, lib/stamped/). The QR holds
-- "CS1:<code>:<page>"; each code is one student's copy. When the scans come
-- back, the batch grader reads the codes in the browser and places every page
-- with no AI name reading, across classes and in any order.
-- Service role writes; teachers read their own rows.

CREATE TABLE IF NOT EXISTS stamped_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  pages int NOT NULL CHECK (pages BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stamped_copies (
  code text PRIMARY KEY,
  test_id uuid NOT NULL REFERENCES stamped_tests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  roster_id uuid REFERENCES class_roster(id) ON DELETE SET NULL,
  student_name text NOT NULL
);
CREATE INDEX IF NOT EXISTS stamped_copies_test_idx ON stamped_copies (test_id);

ALTER TABLE stamped_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamped_copies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers read own stamped tests" ON stamped_tests;
CREATE POLICY "Teachers read own stamped tests" ON stamped_tests FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Teachers read own stamped copies" ON stamped_copies;
CREATE POLICY "Teachers read own stamped copies" ON stamped_copies FOR SELECT USING ((select auth.uid()) = user_id);
