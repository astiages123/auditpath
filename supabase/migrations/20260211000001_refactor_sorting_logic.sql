-- Refactor note_chunks sorting logic and clean up obsolete columns
BEGIN;

-- 1. Remove the old unique constraint if it exists. 
-- Based on the manual-sync.ts upsert: onConflict: 'course_id,section_title,sequence_order'
-- We check for the constraint name. If not known, we can drop it by looking up or just try/catch if possible.
-- In Supabase/Postgres, we can find the constraint name. 
-- I'll assume the standard naming or the one mentioned in the request: 'unique_course_section_chunk'

ALTER TABLE public.note_chunks 
DROP CONSTRAINT IF EXISTS unique_course_section_chunk;

-- If it was manually created with another name, we might need to find it.
-- But the user explicitly mentioned 'unique_course_section_chunk'.

-- 2. Add the new unique constraint
-- This ensures that for a given course and section, the chunk_order is unique.
ALTER TABLE public.note_chunks
ADD CONSTRAINT unique_course_section_chunk_order UNIQUE (course_id, section_title, chunk_order);

-- 3. Drop obsolete columns
ALTER TABLE public.note_chunks 
DROP COLUMN IF EXISTS sequence_order,
DROP COLUMN IF EXISTS density_score,
DROP COLUMN IF EXISTS meaningful_word_count;

COMMIT;
