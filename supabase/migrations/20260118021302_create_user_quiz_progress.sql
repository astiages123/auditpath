-- ============================================
-- SRS: Quiz Response Type Enum
-- ============================================

DO $$ BEGIN
  CREATE TYPE quiz_response_type AS ENUM ('correct', 'incorrect', 'blank', 'struggled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- SRS: User Quiz Progress Table
-- ============================================
-- Detailed history of user's quiz responses
-- Used for analytics, W calculation, and review queue building

CREATE TABLE IF NOT EXISTS user_quiz_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  chunk_id UUID REFERENCES note_chunks(id) ON DELETE SET NULL,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Response details
  response_type quiz_response_type NOT NULL,
  selected_answer INTEGER,              -- NULL if blank
  was_confident BOOLEAN DEFAULT true,   -- false if "Zorlandım" clicked
  
  -- Session context
  session_number INTEGER NOT NULL,      -- Which session of the course
  is_review_question BOOLEAN DEFAULT false, -- Was this from review queue?
  
  -- Timing
  answered_at TIMESTAMPTZ DEFAULT now(),
  time_spent_ms INTEGER                 -- Optional: how long user spent
);

-- Query indexes
CREATE INDEX IF NOT EXISTS idx_progress_user_course 
  ON user_quiz_progress(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_progress_chunk_response 
  ON user_quiz_progress(chunk_id, response_type);

CREATE INDEX IF NOT EXISTS idx_progress_question 
  ON user_quiz_progress(question_id);

CREATE INDEX IF NOT EXISTS idx_progress_session 
  ON user_quiz_progress(user_id, course_id, session_number);

-- Enable RLS
ALTER TABLE user_quiz_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own progress"
  ON user_quiz_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON user_quiz_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON user_quiz_progress FOR UPDATE
  USING (auth.uid() = user_id);
