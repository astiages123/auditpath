-- Add next_review_at column to user_question_status
ALTER TABLE "public"."user_question_status" 
ADD COLUMN "next_review_at" TIMESTAMP WITH TIME ZONE;

-- Add index for efficient filtering by review date
CREATE INDEX IF NOT EXISTS "user_question_status_next_review_idx" 
ON "public"."user_question_status" ("next_review_at");

-- Update existing records to have a default value if needed (optional)
-- UPDATE "public"."user_question_status" SET "next_review_at" = NOW() WHERE "next_review_at" IS NULL;
