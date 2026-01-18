-- Create question_status enum if it doesn't exist
CREATE TYPE "public"."question_status" AS ENUM ('active', 'archived', 'pending_followup');

-- Add status column to questions table
ALTER TABLE "public"."questions" 
ADD COLUMN "status" "public"."question_status" NOT NULL DEFAULT 'active';

-- Add index on status for faster filtering
CREATE INDEX IF NOT EXISTS "questions_status_idx" ON "public"."questions" ("status");
