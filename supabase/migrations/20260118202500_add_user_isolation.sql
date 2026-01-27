-- Add supporting columns for multi-user/global questions
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Enable RLS on questions table
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view logical global questions OR their own private questions
CREATE POLICY "Users can view global and own questions" ON questions
FOR SELECT
USING (
  is_global = true 
  OR 
  (auth.uid() = created_by)
);

-- Policy: Users can insert their own questions (e.g. AI generated follow-ups)
CREATE POLICY "Users can insert own questions" ON questions
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
);

-- Policy: Users can update their own questions
CREATE POLICY "Users can update own questions" ON questions
FOR UPDATE
USING (
  auth.uid() = created_by
);

-- Ensure RLS on user_quiz_progress
ALTER TABLE user_quiz_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state if they exist, or create if not
DROP POLICY IF EXISTS "Users can view own progress" ON user_quiz_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_quiz_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_quiz_progress;

CREATE POLICY "Users can view own progress" ON user_quiz_progress
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON user_quiz_progress
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON user_quiz_progress
FOR UPDATE USING (auth.uid() = user_id);

-- Ensure RLS on chunk_mastery
ALTER TABLE chunk_mastery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own mastery" ON chunk_mastery;
DROP POLICY IF EXISTS "Users can manage own mastery" ON chunk_mastery;

CREATE POLICY "Users can view own mastery" ON chunk_mastery
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own mastery" ON chunk_mastery
FOR ALL USING (auth.uid() = user_id);
