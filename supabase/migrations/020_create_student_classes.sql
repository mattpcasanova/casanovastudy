-- Create student_classes table for class/period assignments
-- Allows students to be in multiple classes with the same teacher
CREATE TABLE IF NOT EXISTS student_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  class_period TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Allow same student-teacher pair with different classes
  UNIQUE(student_id, teacher_id, class_name)
);

-- Indexes for efficient queries
CREATE INDEX idx_student_classes_student ON student_classes(student_id);
CREATE INDEX idx_student_classes_teacher ON student_classes(teacher_id);
CREATE INDEX idx_student_classes_class_name ON student_classes(class_name);

-- Enable RLS
ALTER TABLE student_classes ENABLE ROW LEVEL SECURITY;

-- Permissive policies (same pattern as teacher_follows - using admin client in API)
CREATE POLICY "Allow all select" ON student_classes
  FOR SELECT USING (true);

CREATE POLICY "Allow all insert" ON student_classes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all update" ON student_classes
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow all delete" ON student_classes
  FOR DELETE USING (true);
