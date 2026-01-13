-- Add class_name field to study_guides for filtering by class
ALTER TABLE study_guides
ADD COLUMN IF NOT EXISTS class_name TEXT;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_study_guides_class_name ON study_guides(class_name);
