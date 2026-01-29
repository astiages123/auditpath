-- Drop unused columns from note_chunks table
ALTER TABLE "public"."note_chunks" DROP COLUMN IF EXISTS "checksum";
ALTER TABLE "public"."note_chunks" DROP COLUMN IF EXISTS "parent_h1_id";
ALTER TABLE "public"."note_chunks" DROP COLUMN IF EXISTS "parent_h2";
