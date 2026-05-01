-- Phase 1 of the teacher-side overhaul: first-class classes + enrollments.
-- Replaces the string-based student_classes table (kept around for now;
-- a follow-up migration will drop it once the new model is fully wired).
--
-- See plan: ~/.claude/plans/i-made-this-site-enumerated-dove.md

-- =============================================================================
-- TABLE: classes
-- =============================================================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period TEXT,
  subject TEXT,
  enrollment_code TEXT NOT NULL UNIQUE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_enrollment_code ON classes(enrollment_code);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_archived ON classes(teacher_id, is_archived);

-- =============================================================================
-- FUNCTION: generate_class_code
-- 6-char uppercase alphanumeric, excludes visually-confusing chars (0/O, 1/I/L).
-- Caller-side collision retry kept simple: relies on UNIQUE constraint + retry
-- inside the function (up to 100 attempts).
-- =============================================================================
CREATE OR REPLACE FUNCTION generate_class_code() RETURNS TEXT AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  alphabet_len CONSTANT INT := length(alphabet);
  code TEXT;
  attempts INT := 0;
  collision INT;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substring(alphabet, floor(random() * alphabet_len)::int + 1, 1);
    END LOOP;

    SELECT COUNT(*) INTO collision FROM classes WHERE enrollment_code = code;
    EXIT WHEN collision = 0;

    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique class code after 100 attempts';
    END IF;
  END LOOP;

  RETURN code;
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public, pg_temp;

-- =============================================================================
-- TABLE: class_enrollments
-- =============================================================================
CREATE TABLE IF NOT EXISTS class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'removed')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_class ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_active
  ON class_enrollments(student_id) WHERE status = 'active';

-- =============================================================================
-- RLS: classes
-- =============================================================================
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Teachers fully manage their own classes
CREATE POLICY "Teachers manage own classes (select)" ON classes
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers manage own classes (insert)" ON classes
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers manage own classes (update)" ON classes
  FOR UPDATE USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers manage own classes (delete)" ON classes
  FOR DELETE USING (auth.uid() = teacher_id);

-- Students can read classes they are actively enrolled in
CREATE POLICY "Students view enrolled classes" ON classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE class_enrollments.class_id = classes.id
        AND class_enrollments.student_id = auth.uid()
        AND class_enrollments.status = 'active'
    )
  );

-- =============================================================================
-- RLS: class_enrollments
-- =============================================================================
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

-- Students see their own enrollments
CREATE POLICY "Students view own enrollments" ON class_enrollments
  FOR SELECT USING (auth.uid() = student_id);

-- Teachers see all enrollments for their classes
CREATE POLICY "Teachers view enrollments in own classes" ON class_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_enrollments.class_id
        AND classes.teacher_id = auth.uid()
    )
  );

-- Students join classes for themselves (the API enforces the code match
-- before insert; this policy just guarantees a student cannot enroll someone else)
CREATE POLICY "Students self-enroll" ON class_enrollments
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Teachers can directly enroll/remove students in their own classes
CREATE POLICY "Teachers insert enrollments in own classes" ON class_enrollments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_enrollments.class_id
        AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers update enrollments in own classes" ON class_enrollments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_enrollments.class_id
        AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers delete enrollments in own classes" ON class_enrollments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_enrollments.class_id
        AND classes.teacher_id = auth.uid()
    )
  );

-- Students can leave a class (delete their own active enrollment)
CREATE POLICY "Students leave own class" ON class_enrollments
  FOR DELETE USING (auth.uid() = student_id);

-- =============================================================================
-- BACKFILL from existing student_classes rows
-- For each unique (teacher_id, class_name, class_period) we create one class
-- and enroll every matching student. teacher_follows rows without a
-- corresponding student_classes row are NOT auto-migrated — those students
-- will need to join via enrollment code (intentional: forces a clean roster).
-- Idempotent: ON CONFLICT DO NOTHING means re-running this migration is safe.
-- =============================================================================
DO $$
DECLARE
  src RECORD;
  new_class_id UUID;
BEGIN
  -- Step 1: create one class per distinct (teacher, name, period)
  FOR src IN
    SELECT DISTINCT teacher_id, class_name, class_period
    FROM student_classes
  LOOP
    -- Skip if a class with the same teacher + name + period was already migrated
    SELECT id INTO new_class_id
    FROM classes
    WHERE teacher_id = src.teacher_id
      AND name = src.class_name
      AND COALESCE(period, '') = COALESCE(src.class_period, '');

    IF new_class_id IS NULL THEN
      INSERT INTO classes (teacher_id, name, period, enrollment_code)
      VALUES (src.teacher_id, src.class_name, src.class_period, generate_class_code())
      RETURNING id INTO new_class_id;
    END IF;
  END LOOP;

  -- Step 2: enroll every student_classes row into the matching class
  INSERT INTO class_enrollments (class_id, student_id, status, joined_at)
  SELECT
    c.id,
    sc.student_id,
    'active',
    sc.created_at
  FROM student_classes sc
  JOIN classes c
    ON c.teacher_id = sc.teacher_id
   AND c.name = sc.class_name
   AND COALESCE(c.period, '') = COALESCE(sc.class_period, '')
  ON CONFLICT (class_id, student_id) DO NOTHING;
END $$;

-- =============================================================================
-- updated_at trigger for classes
-- =============================================================================
CREATE OR REPLACE FUNCTION set_classes_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS classes_updated_at ON classes;
CREATE TRIGGER classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION set_classes_updated_at();
