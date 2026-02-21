drop policy "Allow update for service role" on "public"."note_chunks";

drop policy "Users can only access their own data" on "public"."ai_generation_logs";

drop policy "Users can view their own logs" on "public"."ai_generation_logs";

drop policy "Users can insert their own mastery" on "public"."chunk_mastery";

drop policy "Users can manage own mastery" on "public"."chunk_mastery";

drop policy "Users can view own mastery" on "public"."chunk_mastery";

drop policy "Users can insert their own counters" on "public"."course_session_counters";

drop policy "Users can only access their own data" on "public"."course_session_counters";

drop policy "Users can update their own counters" on "public"."course_session_counters";

drop policy "Users can only access their own data" on "public"."pomodoro_sessions";

drop policy "Users manage own sessions" on "public"."pomodoro_sessions";

drop policy "Users can delete their own questions" on "public"."questions";

drop policy "Users can insert own questions" on "public"."questions";

drop policy "Users can update own questions" on "public"."questions";

drop policy "Users can update their own questions" on "public"."questions";

drop policy "Users can manage their own achievements" on "public"."user_achievements";

drop policy "Users can only access their own data" on "public"."user_achievements";

drop policy "Users can update their own progress" on "public"."user_quiz_progress";

drop policy "Users can insert own profile" on "public"."users";

drop policy "Users can update own profile" on "public"."users";

drop policy "Users can view their own profile" on "public"."users";

drop policy "Users can delete their own video progress" on "public"."video_progress";

drop policy "Users can insert their own video progress" on "public"."video_progress";

drop policy "Users can only access their own data" on "public"."video_progress";

drop policy "Users can update their own video progress" on "public"."video_progress";

drop policy "Users can view their own video progress" on "public"."video_progress";

revoke delete on table "public"."user_quotas" from "anon";

revoke insert on table "public"."user_quotas" from "anon";

revoke references on table "public"."user_quotas" from "anon";

revoke select on table "public"."user_quotas" from "anon";

revoke trigger on table "public"."user_quotas" from "anon";

revoke truncate on table "public"."user_quotas" from "anon";

revoke update on table "public"."user_quotas" from "anon";

revoke delete on table "public"."user_quotas" from "authenticated";

revoke insert on table "public"."user_quotas" from "authenticated";

revoke references on table "public"."user_quotas" from "authenticated";

revoke select on table "public"."user_quotas" from "authenticated";

revoke trigger on table "public"."user_quotas" from "authenticated";

revoke truncate on table "public"."user_quotas" from "authenticated";

revoke update on table "public"."user_quotas" from "authenticated";

revoke delete on table "public"."user_quotas" from "service_role";

revoke insert on table "public"."user_quotas" from "service_role";

revoke references on table "public"."user_quotas" from "service_role";

revoke select on table "public"."user_quotas" from "service_role";

revoke trigger on table "public"."user_quotas" from "service_role";

revoke truncate on table "public"."user_quotas" from "service_role";

revoke update on table "public"."user_quotas" from "service_role";

alter table "public"."chunk_mastery" drop constraint "chunk_mastery_user_id_chunk_id_key";

drop index if exists "public"."chunk_mastery_user_id_chunk_id_key";

drop index if exists "public"."idx_mastery_user_course";

drop index if exists "public"."idx_progress_user_course";

drop index if exists "public"."idx_user_quiz_progress_user_course";

alter table "public"."note_chunks" drop column "display_content";

CREATE INDEX idx_ai_generation_logs_user_id ON public.ai_generation_logs USING btree (user_id);

CREATE INDEX idx_chunk_mastery_chunk_id ON public.chunk_mastery USING btree (chunk_id);

CREATE INDEX idx_course_session_counters_course_id ON public.course_session_counters USING btree (course_id);

CREATE INDEX idx_courses_category_id ON public.courses USING btree (category_id);

CREATE INDEX idx_pomodoro_sessions_course_id ON public.pomodoro_sessions USING btree (course_id);

CREATE INDEX idx_questions_course_id ON public.questions USING btree (course_id);

CREATE INDEX idx_user_question_status_question_id ON public.user_question_status USING btree (question_id);

CREATE INDEX idx_user_quiz_progress_chunk_id ON public.user_quiz_progress USING btree (chunk_id);

CREATE INDEX idx_video_progress_video_id ON public.video_progress USING btree (video_id);

CREATE INDEX idx_videos_course_id ON public.videos USING btree (course_id);


  create policy "Allow service_role full access"
  on "public"."ai_generation_logs"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Anyone can read categories"
  on "public"."categories"
  as permissive
  for select
  to public
using (true);



  create policy "Users can only access their own data"
  on "public"."chunk_mastery"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can update their own mastery"
  on "public"."chunk_mastery"
  as permissive
  for update
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can view their own mastery"
  on "public"."chunk_mastery"
  as permissive
  for select
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Anyone can read courses"
  on "public"."courses"
  as permissive
  for select
  to public
using (true);



  create policy "service_role_manage_rates"
  on "public"."exchange_rates"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Anyone can read note_chunks"
  on "public"."note_chunks"
  as permissive
  for select
  to public
using (true);



  create policy "Service Role Full Access"
  on "public"."note_chunks"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Allow creator to insert questions"
  on "public"."questions"
  as permissive
  for insert
  to authenticated
with check ((( SELECT auth.uid() AS uid) = created_by));



  create policy "Anyone can view questions"
  on "public"."questions"
  as permissive
  for select
  to public
using (true);



  create policy "Users can insert questions"
  on "public"."questions"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Anyone can read subject_guidelines"
  on "public"."subject_guidelines"
  as permissive
  for select
  to public
using (true);



  create policy "Users can insert own progress"
  on "public"."user_quiz_progress"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can only access their own data"
  on "public"."user_quiz_progress"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can update own progress"
  on "public"."user_quiz_progress"
  as permissive
  for update
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can view own progress"
  on "public"."user_quiz_progress"
  as permissive
  for select
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can update their own profile"
  on "public"."users"
  as permissive
  for update
  to authenticated
using ((( SELECT auth.uid() AS uid) = id));



  create policy "Anyone can read videos"
  on "public"."videos"
  as permissive
  for select
  to public
using (true);



  create policy "Users can only access their own data"
  on "public"."ai_generation_logs"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can view their own logs"
  on "public"."ai_generation_logs"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can insert their own mastery"
  on "public"."chunk_mastery"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can manage own mastery"
  on "public"."chunk_mastery"
  as permissive
  for all
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can view own mastery"
  on "public"."chunk_mastery"
  as permissive
  for select
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can insert their own counters"
  on "public"."course_session_counters"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can only access their own data"
  on "public"."course_session_counters"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can update their own counters"
  on "public"."course_session_counters"
  as permissive
  for update
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can only access their own data"
  on "public"."pomodoro_sessions"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users manage own sessions"
  on "public"."pomodoro_sessions"
  as permissive
  for all
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can delete their own questions"
  on "public"."questions"
  as permissive
  for delete
  to public
using ((( SELECT auth.uid() AS uid) = created_by));



  create policy "Users can insert own questions"
  on "public"."questions"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) = created_by));



  create policy "Users can update own questions"
  on "public"."questions"
  as permissive
  for update
  to public
using ((( SELECT auth.uid() AS uid) = created_by));



  create policy "Users can update their own questions"
  on "public"."questions"
  as permissive
  for update
  to public
using ((( SELECT auth.uid() AS uid) = created_by));



  create policy "Users can manage their own achievements"
  on "public"."user_achievements"
  as permissive
  for all
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can only access their own data"
  on "public"."user_achievements"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can update their own progress"
  on "public"."user_quiz_progress"
  as permissive
  for update
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can insert own profile"
  on "public"."users"
  as permissive
  for insert
  to authenticated
with check ((( SELECT auth.uid() AS uid) = id));



  create policy "Users can update own profile"
  on "public"."users"
  as permissive
  for update
  to authenticated
using ((( SELECT auth.uid() AS uid) = id));



  create policy "Users can view their own profile"
  on "public"."users"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = id));



  create policy "Users can delete their own video progress"
  on "public"."video_progress"
  as permissive
  for delete
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can insert their own video progress"
  on "public"."video_progress"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can only access their own data"
  on "public"."video_progress"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can update their own video progress"
  on "public"."video_progress"
  as permissive
  for update
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can view their own video progress"
  on "public"."video_progress"
  as permissive
  for select
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



