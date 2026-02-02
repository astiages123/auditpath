-- Add sequence_order column to note_chunks
ALTER TABLE "public"."note_chunks" 
ADD COLUMN IF NOT EXISTS "sequence_order" integer DEFAULT 0 NOT NULL;

-- Drop old unique constraints if they exist
ALTER TABLE "public"."note_chunks" 
DROP CONSTRAINT IF EXISTS "unique_course_section",
DROP CONSTRAINT IF EXISTS "unique_course_section_chunk";

-- Add new unique constraint including sequence_order
ALTER TABLE "public"."note_chunks" 
ADD CONSTRAINT "unique_course_section_chunk" 
UNIQUE ("course_id", "section_title", "sequence_order");
