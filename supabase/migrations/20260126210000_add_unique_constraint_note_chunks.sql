-- Add unique constraint to note_chunks table to support ON CONFLICT upserts
ALTER TABLE note_chunks 
ADD CONSTRAINT unique_course_section UNIQUE (course_id, section_title);
