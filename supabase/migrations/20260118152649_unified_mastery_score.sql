-- Unified Mastery Score Migration

-- 1. Modify chunk_mastery to introduce mastery_score and remove legacy fields
alter table chunk_mastery 
  add column mastery_score integer not null default 0 check (mastery_score >= 0 and mastery_score <= 100);

-- Drop legacy columns
alter table chunk_mastery
  drop column if exists srs_level,
  drop column if exists score;

-- 2. Modify user_quiz_progress to remove 'was_confident' (used for Struggled logic)
alter table user_quiz_progress
  drop column if exists was_confident;

-- Note: The enum 'quiz_response_type' value 'struggled' is deprecated and will be ignored in application logic.
