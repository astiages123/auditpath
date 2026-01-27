-- Create user_question_status table
CREATE TABLE IF NOT EXISTS user_question_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    status question_status NOT NULL DEFAULT 'active',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, question_id)
);

-- Enable RLS
ALTER TABLE user_question_status ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own question status" ON user_question_status
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Drop status column from questions to force refactor
-- WARNING: This is a breaking change.
ALTER TABLE questions DROP COLUMN IF EXISTS status;
