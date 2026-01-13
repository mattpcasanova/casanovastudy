-- Fix teacher_follows RLS policies to allow teachers to manage their students
-- Currently only students can add themselves (follower_id = auth.uid())
-- Teachers need to be able to add students (teacher_id = auth.uid())

-- Allow teachers to add students to their class
CREATE POLICY "Teachers can add students" ON teacher_follows
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

-- Allow teachers to remove students from their class
CREATE POLICY "Teachers can remove students" ON teacher_follows
  FOR DELETE USING (auth.uid() = teacher_id);
