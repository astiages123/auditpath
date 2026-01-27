-- ============================================
-- SRS: Weekly Schedule Table
-- ============================================
-- Stores user's weekly study schedule
-- Used to determine which courses are active on which days
-- and to calculate session numbers for SRS algorithm

CREATE TABLE IF NOT EXISTS weekly_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,           -- "Ekonomi", "Hukuk" etc.
  match_days INTEGER[] NOT NULL,   -- [1, 3] = Monday, Wednesday (JS getDay() format)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure one schedule entry per subject per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_user_subject 
  ON weekly_schedule(user_id, subject);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_schedule_user 
  ON weekly_schedule(user_id);

-- Enable RLS
ALTER TABLE weekly_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own schedule"
  ON weekly_schedule FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedule"
  ON weekly_schedule FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedule"
  ON weekly_schedule FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedule"
  ON weekly_schedule FOR DELETE
  USING (auth.uid() = user_id);
