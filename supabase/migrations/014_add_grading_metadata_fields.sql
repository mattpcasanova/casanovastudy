-- Add metadata fields to grading_results table
-- These allow teachers to organize and filter grading results

-- Add student first/last name for better sorting
ALTER TABLE grading_results
ADD COLUMN IF NOT EXISTS student_first_name TEXT;

ALTER TABLE grading_results
ADD COLUMN IF NOT EXISTS student_last_name TEXT;

-- Add class organization fields
ALTER TABLE grading_results
ADD COLUMN IF NOT EXISTS class_name TEXT;

ALTER TABLE grading_results
ADD COLUMN IF NOT EXISTS class_period TEXT;

-- Add exam title for filtering by exam
ALTER TABLE grading_results
ADD COLUMN IF NOT EXISTS exam_title TEXT;

-- Add original filename to preserve the uploaded filename before processing
ALTER TABLE grading_results
ADD COLUMN IF NOT EXISTS original_filename TEXT;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_grading_results_class_name ON grading_results(class_name);
CREATE INDEX IF NOT EXISTS idx_grading_results_class_period ON grading_results(class_period);
CREATE INDEX IF NOT EXISTS idx_grading_results_exam_title ON grading_results(exam_title);
CREATE INDEX IF NOT EXISTS idx_grading_results_student_last_name ON grading_results(student_last_name);
