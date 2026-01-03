-- Create flashcard_progress table to track user progress on flashcards
CREATE TABLE flashcard_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_guide_id UUID NOT NULL REFERENCES study_guides(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('mastered', 'difficult')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, study_guide_id, card_id)
);

-- Enable RLS
ALTER TABLE flashcard_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own progress
CREATE POLICY "Users can view own flashcard progress" ON flashcard_progress
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own flashcard progress" ON flashcard_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own flashcard progress" ON flashcard_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own progress
CREATE POLICY "Users can delete own flashcard progress" ON flashcard_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_flashcard_progress_user_guide ON flashcard_progress(user_id, study_guide_id);
