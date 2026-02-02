-- Add cognitive memory columns to user_quiz_progress
ALTER TABLE user_quiz_progress
ADD COLUMN IF NOT EXISTS ai_diagnosis TEXT,
ADD COLUMN IF NOT EXISTS ai_insight TEXT;

-- Add consecutive_fails to user_question_status
ALTER TABLE user_question_status
ADD COLUMN IF NOT EXISTS consecutive_fails INTEGER DEFAULT 0;
