-- Add publishing and custom content fields to study_guides

-- Add is_published flag (default false for existing guides)
ALTER TABLE study_guides
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Add published_at timestamp
ALTER TABLE study_guides
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- Add custom_content JSONB for rich custom guide content
ALTER TABLE study_guides
  ADD COLUMN IF NOT EXISTS custom_content JSONB;

-- Drop the old format constraint and add new one including 'custom'
ALTER TABLE study_guides DROP CONSTRAINT IF EXISTS study_guides_format_check;
ALTER TABLE study_guides
  ADD CONSTRAINT study_guides_format_check
  CHECK (format IN ('outline', 'flashcards', 'quiz', 'summary', 'custom'));

-- Index for finding published guides by a user efficiently
CREATE INDEX IF NOT EXISTS idx_study_guides_published
  ON study_guides(user_id, is_published)
  WHERE is_published = true;

-- Index for published_at for sorting
CREATE INDEX IF NOT EXISTS idx_study_guides_published_at
  ON study_guides(published_at DESC)
  WHERE is_published = true;
