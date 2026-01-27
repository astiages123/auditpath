-- Give permissions to authenticated users and service role for SRS tables
-- This fixes the 403 Forbidden error when accessing these tables

GRANT ALL ON TABLE "public"."chunk_mastery" TO "authenticated";
GRANT ALL ON TABLE "public"."chunk_mastery" TO "service_role";

GRANT ALL ON TABLE "public"."user_quiz_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_quiz_progress" TO "service_role";
