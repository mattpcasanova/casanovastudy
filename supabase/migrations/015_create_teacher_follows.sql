-- Create teacher_follows table for student-teacher following relationships
CREATE TABLE IF NOT EXISTS teacher_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, teacher_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_teacher_follows_follower ON teacher_follows(follower_id);
CREATE INDEX idx_teacher_follows_teacher ON teacher_follows(teacher_id);

-- Enable RLS
ALTER TABLE teacher_follows ENABLE ROW LEVEL SECURITY;

-- Users can view their own follows (who they follow)
CREATE POLICY "Users can view own follows" ON teacher_follows
  FOR SELECT USING (auth.uid() = follower_id);

-- Teachers can see who follows them
CREATE POLICY "Teachers can view their followers" ON teacher_follows
  FOR SELECT USING (auth.uid() = teacher_id);

-- Users can follow teachers (insert)
CREATE POLICY "Users can follow teachers" ON teacher_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow (delete)
CREATE POLICY "Users can unfollow" ON teacher_follows
  FOR DELETE USING (auth.uid() = follower_id);
