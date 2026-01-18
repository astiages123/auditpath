-- Give permissions to authenticated users and service role
GRANT ALL ON TABLE "public"."course_session_counters" TO "authenticated";
GRANT ALL ON TABLE "public"."course_session_counters" TO "service_role";
