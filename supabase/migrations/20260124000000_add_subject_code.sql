-- Add subject_code column to subject_guidelines
ALTER TABLE subject_guidelines 
ADD COLUMN IF NOT EXISTS subject_code text;

-- Make subject_code unique (and not null ideally, but we might have existing data)
-- For now, let's just add the constraint. If there is existing data, we might need to backfill it first, 
-- but given this is a dev environment transition, we'll assume it's okay or strict.
CREATE UNIQUE INDEX IF NOT EXISTS subject_guidelines_subject_code_key ON subject_guidelines (subject_code);
