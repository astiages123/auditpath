-- ============================================
-- Schema Improvement: Add FK to note_chunks
-- ============================================
-- Adds foreign key constraint for data integrity
-- course_id should reference courses table

-- Add FK constraint with CASCADE delete
-- If a course is deleted, its note chunks will also be deleted
ALTER TABLE note_chunks 
ADD CONSTRAINT note_chunks_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
