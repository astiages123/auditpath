create extension if not exists "pg_net" with schema "public";

revoke delete on table "public"."ai_generation_logs" from "anon";

revoke insert on table "public"."ai_generation_logs" from "anon";

revoke references on table "public"."ai_generation_logs" from "anon";

revoke select on table "public"."ai_generation_logs" from "anon";

revoke trigger on table "public"."ai_generation_logs" from "anon";

revoke truncate on table "public"."ai_generation_logs" from "anon";

revoke update on table "public"."ai_generation_logs" from "anon";

revoke delete on table "public"."ai_generation_logs" from "authenticated";

revoke insert on table "public"."ai_generation_logs" from "authenticated";

revoke references on table "public"."ai_generation_logs" from "authenticated";

revoke trigger on table "public"."ai_generation_logs" from "authenticated";

revoke truncate on table "public"."ai_generation_logs" from "authenticated";

revoke update on table "public"."ai_generation_logs" from "authenticated";

revoke delete on table "public"."chunk_mastery" from "anon";

revoke insert on table "public"."chunk_mastery" from "anon";

revoke references on table "public"."chunk_mastery" from "anon";

revoke select on table "public"."chunk_mastery" from "anon";

revoke trigger on table "public"."chunk_mastery" from "anon";

revoke truncate on table "public"."chunk_mastery" from "anon";

revoke update on table "public"."chunk_mastery" from "anon";

revoke delete on table "public"."course_session_counters" from "anon";

revoke insert on table "public"."course_session_counters" from "anon";

revoke references on table "public"."course_session_counters" from "anon";

revoke select on table "public"."course_session_counters" from "anon";

revoke trigger on table "public"."course_session_counters" from "anon";

revoke truncate on table "public"."course_session_counters" from "anon";

revoke update on table "public"."course_session_counters" from "anon";

revoke delete on table "public"."exchange_rates" from "anon";

revoke insert on table "public"."exchange_rates" from "anon";

revoke references on table "public"."exchange_rates" from "anon";

revoke trigger on table "public"."exchange_rates" from "anon";

revoke truncate on table "public"."exchange_rates" from "anon";

revoke update on table "public"."exchange_rates" from "anon";

revoke references on table "public"."questions" from "anon";

revoke trigger on table "public"."questions" from "anon";

revoke truncate on table "public"."questions" from "anon";

revoke delete on table "public"."subject_guidelines" from "anon";

revoke insert on table "public"."subject_guidelines" from "anon";

revoke references on table "public"."subject_guidelines" from "anon";

revoke trigger on table "public"."subject_guidelines" from "anon";

revoke truncate on table "public"."subject_guidelines" from "anon";

revoke update on table "public"."subject_guidelines" from "anon";

revoke delete on table "public"."subject_guidelines" from "authenticated";

revoke insert on table "public"."subject_guidelines" from "authenticated";

revoke references on table "public"."subject_guidelines" from "authenticated";

revoke trigger on table "public"."subject_guidelines" from "authenticated";

revoke truncate on table "public"."subject_guidelines" from "authenticated";

revoke update on table "public"."subject_guidelines" from "authenticated";

revoke delete on table "public"."subject_guidelines" from "service_role";

revoke insert on table "public"."subject_guidelines" from "service_role";

revoke references on table "public"."subject_guidelines" from "service_role";

revoke trigger on table "public"."subject_guidelines" from "service_role";

revoke truncate on table "public"."subject_guidelines" from "service_role";

revoke update on table "public"."subject_guidelines" from "service_role";

revoke delete on table "public"."user_question_status" from "anon";

revoke insert on table "public"."user_question_status" from "anon";

revoke references on table "public"."user_question_status" from "anon";

revoke select on table "public"."user_question_status" from "anon";

revoke trigger on table "public"."user_question_status" from "anon";

revoke truncate on table "public"."user_question_status" from "anon";

revoke update on table "public"."user_question_status" from "anon";

revoke delete on table "public"."user_quiz_progress" from "anon";

revoke insert on table "public"."user_quiz_progress" from "anon";

revoke references on table "public"."user_quiz_progress" from "anon";

revoke select on table "public"."user_quiz_progress" from "anon";

revoke trigger on table "public"."user_quiz_progress" from "anon";

revoke truncate on table "public"."user_quiz_progress" from "anon";

revoke update on table "public"."user_quiz_progress" from "anon";

revoke delete on table "public"."users" from "anon";

revoke insert on table "public"."users" from "anon";

revoke references on table "public"."users" from "anon";

revoke trigger on table "public"."users" from "anon";

revoke truncate on table "public"."users" from "anon";

revoke update on table "public"."users" from "anon";

revoke references on table "public"."users" from "authenticated";

revoke trigger on table "public"."users" from "authenticated";

revoke truncate on table "public"."users" from "authenticated";


  create policy "Allow read access to all users"
  on "public"."ai_generation_logs"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));

-- Soru üretiminde mükerrer kaydı önlemek ve cache performansını artırmak için oluşturulan indeks
CREATE INDEX IF NOT EXISTS "idx_questions_chunk_concept" 
ON "public"."questions" (chunk_id, concept_title);

