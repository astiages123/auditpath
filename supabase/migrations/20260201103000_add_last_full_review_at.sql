-- Add last_full_review_at column to chunk_mastery table
-- This column tracks the last time a user achieved significant mastery (>= 80% coverage)
-- Used for "Aging" (Tozlanma) logic instead of the technical updated_at timestamp

ALTER TABLE "public"."chunk_mastery" 
ADD COLUMN "last_full_review_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill existing data: assume updated_at was the last review time for existing records
UPDATE "public"."chunk_mastery"
SET "last_full_review_at" = "updated_at";
