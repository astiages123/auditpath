-- Grants for questions table
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";

-- Grants for user_question_status table
GRANT ALL ON TABLE "public"."user_question_status" TO "authenticated";
GRANT ALL ON TABLE "public"."user_question_status" TO "service_role";
