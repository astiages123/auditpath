-- Remove parent_h2_id column as it is no longer needed with H2-level chunking
ALTER TABLE note_chunks DROP COLUMN IF EXISTS parent_h2_id;
