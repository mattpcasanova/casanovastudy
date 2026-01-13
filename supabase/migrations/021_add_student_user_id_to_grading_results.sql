-- Add student_user_id to link grade reports to student accounts
-- Nullable for backward compatibility with existing unlinked reports
ALTER TABLE grading_results
ADD COLUMN IF NOT EXISTS student_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for efficient queries by student
CREATE INDEX IF NOT EXISTS idx_grading_results_student_user_id
ON grading_results(student_user_id);

-- Add RLS policy for students to view their own grade reports
-- Note: Existing permissive policies already allow read, this is for clarity
CREATE POLICY "Students can view their grade reports" ON grading_results
  FOR SELECT USING (auth.uid() = student_user_id OR auth.uid() = user_id);
