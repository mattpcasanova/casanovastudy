-- Add user_id column to grading_results table
-- This allows users to save and view their own grading history

-- Step 1: Add user_id column (nullable for backward compatibility with existing records)
-- Use IF NOT EXISTS to avoid errors if column already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grading_results' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE grading_results
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 2: Create index on user_id for efficient queries
CREATE INDEX IF NOT EXISTS idx_grading_results_user_id ON grading_results(user_id);

-- Step 3: Drop existing public RLS policies (if any)
DROP POLICY IF EXISTS "Public can insert grading results" ON grading_results;
DROP POLICY IF EXISTS "Public can view grading results" ON grading_results;

-- Step 4: Create new RLS policies that require authentication

-- Allow users to view only their own grading results
CREATE POLICY "Users can view own grading results"
ON grading_results
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert grading results only with their own user_id
CREATE POLICY "Users can insert own grading results"
ON grading_results
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update only their own grading results
CREATE POLICY "Users can update own grading results"
ON grading_results
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete only their own grading results
CREATE POLICY "Users can delete own grading results"
ON grading_results
FOR DELETE
USING (auth.uid() = user_id);

-- Note: Existing grading results without user_id will not be visible
-- This is acceptable as they represent anonymous/pre-migration data
