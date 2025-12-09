-- Create study_guides table
CREATE TABLE IF NOT EXISTS study_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('outline', 'flashcards', 'quiz', 'summary')),
  content TEXT NOT NULL,
  topic_focus TEXT,
  difficulty_level TEXT,
  additional_instructions TEXT,
  file_count INTEGER DEFAULT 0,
  token_usage JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on created_at for faster queries
CREATE INDEX idx_study_guides_created_at ON study_guides(created_at DESC);

-- Create index on format for filtering
CREATE INDEX idx_study_guides_format ON study_guides(format);

-- Enable Row Level Security (RLS)
ALTER TABLE study_guides ENABLE ROW LEVEL Security;

-- Create policy to allow public read access (study guides are shareable)
CREATE POLICY "Allow public read access" ON study_guides
  FOR SELECT USING (true);

-- Create policy to allow public insert (anyone can create a study guide)
CREATE POLICY "Allow public insert access" ON study_guides
  FOR INSERT WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_study_guides_updated_at
  BEFORE UPDATE ON study_guides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
