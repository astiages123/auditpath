-- Remove legacy SRS columns from chunk_mastery
alter table "public"."chunk_mastery" drop column if exists "next_review_session";

-- Note: srs_level was already missing or not present in types, but if it exists in DB:
alter table "public"."chunk_mastery" drop column if exists "srs_level";

-- Ensure questions status enum is correct (active, archived, pending_followup)
-- This is just a comment as the enum already matches the requirements in the types.
-- If we needed to migrate data:
-- update "public"."questions" set status = 'active' where status not in ('active', 'archived', 'pending_followup');
