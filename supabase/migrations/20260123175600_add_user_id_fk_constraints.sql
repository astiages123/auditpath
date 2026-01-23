-- Add Foreign Key constraints for user_id columns
-- This migration adds FK constraints to ensure data integrity

-- 1. pomodoro_sessions.user_id -> users.id
-- First, clean up any orphan records (if any exist)
DELETE FROM pomodoro_sessions 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM auth.users);

-- Add the FK constraint
ALTER TABLE pomodoro_sessions
ADD CONSTRAINT pomodoro_sessions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. video_progress.user_id -> users.id
-- Clean up orphans first
DELETE FROM video_progress 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM auth.users);

-- Add the FK constraint
ALTER TABLE video_progress
ADD CONSTRAINT video_progress_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index for better query performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_user_id ON video_progress(user_id);
