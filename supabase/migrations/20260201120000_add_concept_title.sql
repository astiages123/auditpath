-- Add concept_title column to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS concept_title TEXT;

-- Create index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_questions_concept_title ON questions(concept_title);
