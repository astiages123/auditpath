-- Migration: Add ai_logic column to note_chunks table
-- Purpose: Support "Bilişsel Doygunluk" (Cognitive Saturation) model
-- This migration adds a JSONB column to store AI's curation decisions

-- Add ai_logic JSONB column with default value
ALTER TABLE "public"."note_chunks"
ADD COLUMN IF NOT EXISTS "ai_logic" JSONB DEFAULT '{"reasoning": "", "suggested_quotas": {"antrenman": 0, "arsiv": 0, "deneme": 0}}'::jsonb;

-- Remove NOT NULL constraint from target_count column
-- This allows the column to be nullable since quotas are now determined by AI
ALTER TABLE "public"."note_chunks"
ALTER COLUMN "target_count" DROP NOT NULL;

-- Add comment to document the new column
COMMENT ON COLUMN "public"."note_chunks"."ai_logic" IS 'AI curation decisions including reasoning and suggested quotas for antrenman, arsiv, and deneme pools. Part of the Cognitive Saturation model.';
