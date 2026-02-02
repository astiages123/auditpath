-- Add display_content column to note_chunks
ALTER TABLE "public"."note_chunks" 
ADD COLUMN IF NOT EXISTS "display_content" text;
