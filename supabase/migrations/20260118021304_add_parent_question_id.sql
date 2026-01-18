-- ============================================
-- SRS: Add parent_question_id to questions
-- ============================================
-- Links variation questions to their original question
-- Used for "ezber bozma" - generating different perspectives

ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS parent_question_id UUID REFERENCES questions(id) ON DELETE SET NULL;

-- Index for finding variations
CREATE INDEX IF NOT EXISTS idx_questions_parent 
  ON questions(parent_question_id) 
  WHERE parent_question_id IS NOT NULL;
