-- Add user_id to study_guides table
ALTER TABLE study_guides
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index on user_id for faster queries
CREATE INDEX idx_study_guides_user_id ON study_guides(user_id);

-- Update RLS policies for study_guides
-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON study_guides;
DROP POLICY IF EXISTS "Allow public insert access" ON study_guides;

-- Create new policies
-- Allow anyone to read study guides (they're shareable)
CREATE POLICY "Allow public read access" ON study_guides
  FOR SELECT USING (true);

-- Allow authenticated users to insert study guides
CREATE POLICY "Allow authenticated users to create guides" ON study_guides
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to update their own study guides
CREATE POLICY "Users can update own guides" ON study_guides
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own study guides
CREATE POLICY "Users can delete own guides" ON study_guides
  FOR DELETE USING (auth.uid() = user_id);

-- Add user_id to grading_results table
ALTER TABLE grading_results
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index on user_id for faster queries
CREATE INDEX idx_grading_results_user_id ON grading_results(user_id);

-- Update RLS policies for grading_results
-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON grading_results;
DROP POLICY IF EXISTS "Allow public insert access" ON grading_results;

-- Create new policies
-- Allow anyone to read grading results (they're shareable)
CREATE POLICY "Allow public read access" ON grading_results
  FOR SELECT USING (true);

-- Allow authenticated users to insert grading results
CREATE POLICY "Allow authenticated users to create results" ON grading_results
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to update their own grading results
CREATE POLICY "Users can update own results" ON grading_results
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own grading results
CREATE POLICY "Users can delete own results" ON grading_results
  FOR DELETE USING (auth.uid() = user_id);
