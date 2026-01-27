-- Migration: Add Question Validation Fields
-- Created: 2026-01-18
-- Purpose: Enable quality validation for generated questions

-- 1. Create validation_status enum type
CREATE TYPE validation_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- 2. Add new columns to questions table
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS quality_score smallint,
  ADD COLUMN IF NOT EXISTS validator_feedback text,
  ADD COLUMN IF NOT EXISTS validation_status validation_status DEFAULT 'APPROVED';

-- 3. Add index for filtering by validation status
CREATE INDEX IF NOT EXISTS idx_questions_validation_status 
  ON questions (validation_status);

-- 4. Add comment for documentation
COMMENT ON COLUMN questions.quality_score IS 'Quality score from validator (0-100)';
COMMENT ON COLUMN questions.validator_feedback IS 'JSON feedback from validator including criteria breakdown';
COMMENT ON COLUMN questions.validation_status IS 'Validation status: PENDING, APPROVED, or REJECTED';
