-- Create grading_results table
CREATE TABLE IF NOT EXISTS grading_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  answer_sheet_filename TEXT,
  student_exam_filename TEXT NOT NULL,
  total_marks INTEGER NOT NULL,
  total_possible_marks INTEGER NOT NULL,
  percentage NUMERIC(5, 2) NOT NULL,
  grade TEXT NOT NULL,
  content TEXT NOT NULL,
  grade_breakdown JSONB NOT NULL,
  additional_comments TEXT,
  pdf_url TEXT,
  token_usage JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on created_at for faster queries
CREATE INDEX idx_grading_results_created_at ON grading_results(created_at DESC);

-- Create index on student_name for searching
CREATE INDEX idx_grading_results_student_name ON grading_results(student_name);

-- Create index on grade for filtering
CREATE INDEX idx_grading_results_grade ON grading_results(grade);

-- Enable Row Level Security (RLS)
ALTER TABLE grading_results ENABLE ROW LEVEL Security;

-- Create policy to allow public read access (grading results are shareable)
CREATE POLICY "Allow public read access" ON grading_results
  FOR SELECT USING (true);

-- Create policy to allow public insert (anyone can grade an exam)
CREATE POLICY "Allow public insert access" ON grading_results
  FOR INSERT WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_grading_results_updated_at
  BEFORE UPDATE ON grading_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
