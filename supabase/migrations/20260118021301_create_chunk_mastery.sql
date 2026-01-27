-- ============================================
-- SRS: Chunk Mastery Table
-- ============================================
-- Tracks user's mastery level for each note chunk
-- Core table for the Spaced Repetition System

CREATE TABLE IF NOT EXISTS chunk_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES note_chunks(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Scoring (0-100, with 70/30 cap rule)
  score NUMERIC(5,2) DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  
  -- SRS Level (0-5)
  -- 0 = New/Failed, needs immediate review
  -- 1 = Learning, review in 2 sessions
  -- 2 = Review, review in 5 sessions
  -- 3-4 = Intermediate, exponentially increasing
  -- 5 = Graduated/Mastery (score = 100)
  srs_level INTEGER DEFAULT 0 CHECK (srs_level >= 0 AND srs_level <= 5),
  
  -- Session tracking (course-specific)
  last_reviewed_session INTEGER DEFAULT 0,
  next_review_session INTEGER DEFAULT 1,
  
  -- Stats for W calculation
  total_questions_seen INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- One mastery record per user per chunk
  UNIQUE(user_id, chunk_id)
);

-- Query indexes
CREATE INDEX IF NOT EXISTS idx_mastery_user_course 
  ON chunk_mastery(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_mastery_next_review 
  ON chunk_mastery(user_id, next_review_session);

CREATE INDEX IF NOT EXISTS idx_mastery_srs_level 
  ON chunk_mastery(user_id, srs_level);

-- Enable RLS
ALTER TABLE chunk_mastery ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own mastery"
  ON chunk_mastery FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mastery"
  ON chunk_mastery FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mastery"
  ON chunk_mastery FOR UPDATE
  USING (auth.uid() = user_id);
