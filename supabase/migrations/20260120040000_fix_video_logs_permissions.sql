
-- Grant permissions to authenticated users
grant select, insert, update, delete on table "public"."video_logs" to "authenticated";
grant select, insert, update, delete on table "public"."video_logs" to "service_role";

-- Ensure RLS is enabled (just to be safe)
alter table "public"."video_logs" enable row level security;
