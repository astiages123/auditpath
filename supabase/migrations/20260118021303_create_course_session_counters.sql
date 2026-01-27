-- ============================================
-- SRS: Course Session Counters Table
-- ============================================
-- Tracks how many sessions have occurred for each course per user
-- Incremented each day the course is in the schedule

CREATE TABLE IF NOT EXISTS course_session_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Session tracking
  current_session INTEGER DEFAULT 0,
  last_session_date DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- One counter per user per course
  UNIQUE(user_id, course_id)
);

-- Query indexes
CREATE INDEX IF NOT EXISTS idx_session_counters_user 
  ON course_session_counters(user_id);

-- Enable RLS
ALTER TABLE course_session_counters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own counters"
  ON course_session_counters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own counters"
  ON course_session_counters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own counters"
  ON course_session_counters FOR UPDATE
  USING (auth.uid() = user_id);
