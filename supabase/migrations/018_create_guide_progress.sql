-- Create guide_progress table to track user progress on study guides
CREATE TABLE IF NOT EXISTS guide_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_guide_id UUID NOT NULL REFERENCES study_guides(id) ON DELETE CASCADE,
  progress_data JSONB NOT NULL DEFAULT '{}',
  -- progress_data stores: { completedSections: string[], checklistItems: Record<string, boolean>, quizAnswers: Record<string, string> }
  completion_percentage INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, study_guide_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_guide_progress_user ON guide_progress(user_id);
CREATE INDEX idx_guide_progress_guide ON guide_progress(study_guide_id);

-- Enable RLS
ALTER TABLE guide_progress ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own progress
CREATE POLICY "Users can view own progress" ON guide_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON guide_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON guide_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress" ON guide_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger (reuse existing function from study_guides)
CREATE TRIGGER update_guide_progress_updated_at
  BEFORE UPDATE ON guide_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
