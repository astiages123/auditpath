drop extension if exists "pg_net";


  create table "public"."categories" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" text not null,
    "slug" text not null,
    "total_hours" numeric default 0,
    "sort_order" integer default 0,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."categories" enable row level security;


  create table "public"."courses" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "course_slug" text not null,
    "name" text not null,
    "lesson_type" text not null,
    "total_videos" integer default 0,
    "total_hours" numeric default 0,
    "playlist_url" text,
    "category_id" uuid,
    "sort_order" integer default 0,
    "created_at" timestamp with time zone default now(),
    "last_hash" text
      );


alter table "public"."courses" enable row level security;


  create table "public"."note_chunks" (
    "id" uuid not null default gen_random_uuid(),
    "course_id" uuid not null,
    "course_name" text not null,
    "section_title" text not null,
    "content" text not null,
    "chunk_order" integer not null,
    "created_at" timestamp with time zone default now(),
    "char_count" integer default 0,
    "word_count" integer default 0,
    "checksum" text,
    "parent_h1_id" text,
    "parent_h2_id" text,
    "metadata" jsonb default '{}'::jsonb
      );


alter table "public"."note_chunks" enable row level security;


  create table "public"."pomodoro_sessions" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid,
    "course_id" uuid,
    "total_work_time" integer default 0,
    "total_break_time" integer default 0,
    "total_pause_time" integer default 0,
    "timeline" jsonb default '[]'::jsonb,
    "started_at" timestamp with time zone not null,
    "ended_at" timestamp with time zone not null,
    "created_at" timestamp with time zone default now(),
    "course_name" text
      );


alter table "public"."pomodoro_sessions" enable row level security;


  create table "public"."questions" (
    "id" uuid not null default gen_random_uuid(),
    "course_id" uuid not null,
    "chunk_id" uuid,
    "section_title" text not null,
    "question_data" jsonb not null,
    "created_by" uuid default auth.uid(),
    "created_at" timestamp with time zone default now()
      );


alter table "public"."questions" enable row level security;


  create table "public"."subject_guidelines" (
    "id" uuid not null default gen_random_uuid(),
    "subject_name" text not null,
    "instruction" text not null,
    "few_shot_example" jsonb not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."subject_guidelines" enable row level security;


  create table "public"."user_achievements" (
    "user_id" uuid not null,
    "achievement_id" text not null,
    "unlocked_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "is_celebrated" boolean default false,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."user_achievements" enable row level security;


  create table "public"."users" (
    "id" uuid not null,
    "email" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone default now(),
    "xp" integer default 0,
    "title" text default 'Sürgün'::text,
    "last_synced_at" timestamp with time zone,
    "daily_generation_count" integer default 0,
    "last_generation_date" timestamp with time zone default now()
      );


alter table "public"."users" enable row level security;


  create table "public"."video_progress" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid,
    "video_id" uuid,
    "completed" boolean default false,
    "updated_at" timestamp with time zone default now(),
    "completed_at" timestamp with time zone
      );


alter table "public"."video_progress" enable row level security;


  create table "public"."videos" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "video_number" integer not null,
    "title" text not null,
    "duration" text not null,
    "duration_minutes" numeric default 0,
    "course_id" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."videos" enable row level security;

CREATE UNIQUE INDEX "Category_pkey" ON public.categories USING btree (id);

CREATE UNIQUE INDEX "Course_pkey" ON public.courses USING btree (id);

CREATE UNIQUE INDEX "PomodoroSession_pkey" ON public.pomodoro_sessions USING btree (id);

CREATE UNIQUE INDEX "UserAchievement_pkey" ON public.user_achievements USING btree (user_id, achievement_id);

CREATE UNIQUE INDEX "User_pkey" ON public.users USING btree (id);

CREATE UNIQUE INDEX "VideoProgress_pkey" ON public.video_progress USING btree (id);

CREATE UNIQUE INDEX "VideoProgress_userId_videoId_key" ON public.video_progress USING btree (user_id, video_id);

CREATE UNIQUE INDEX "Video_pkey" ON public.videos USING btree (id);

CREATE INDEX idx_pomodoro_session_user_started ON public.pomodoro_sessions USING btree (user_id, started_at);

CREATE INDEX idx_pomodoro_sessions_user_started ON public.pomodoro_sessions USING btree (user_id, started_at);

CREATE INDEX idx_video_progress_user_completed ON public.video_progress USING btree (user_id, completed_at);

CREATE INDEX idx_video_progress_user_video ON public.video_progress USING btree (user_id, video_id);

CREATE UNIQUE INDEX note_chunks_pkey ON public.note_chunks USING btree (id);

CREATE UNIQUE INDEX questions_pkey ON public.questions USING btree (id);

CREATE UNIQUE INDEX subject_guidelines_pkey ON public.subject_guidelines USING btree (id);

CREATE UNIQUE INDEX subject_guidelines_subject_name_key ON public.subject_guidelines USING btree (subject_name);

CREATE UNIQUE INDEX unique_course_section ON public.note_chunks USING btree (course_id, section_title);

alter table "public"."categories" add constraint "Category_pkey" PRIMARY KEY using index "Category_pkey";

alter table "public"."courses" add constraint "Course_pkey" PRIMARY KEY using index "Course_pkey";

alter table "public"."note_chunks" add constraint "note_chunks_pkey" PRIMARY KEY using index "note_chunks_pkey";

alter table "public"."pomodoro_sessions" add constraint "PomodoroSession_pkey" PRIMARY KEY using index "PomodoroSession_pkey";

alter table "public"."questions" add constraint "questions_pkey" PRIMARY KEY using index "questions_pkey";

alter table "public"."subject_guidelines" add constraint "subject_guidelines_pkey" PRIMARY KEY using index "subject_guidelines_pkey";

alter table "public"."user_achievements" add constraint "UserAchievement_pkey" PRIMARY KEY using index "UserAchievement_pkey";

alter table "public"."users" add constraint "User_pkey" PRIMARY KEY using index "User_pkey";

alter table "public"."video_progress" add constraint "VideoProgress_pkey" PRIMARY KEY using index "VideoProgress_pkey";

alter table "public"."videos" add constraint "Video_pkey" PRIMARY KEY using index "Video_pkey";

alter table "public"."courses" add constraint "Course_categoryId_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE not valid;

alter table "public"."courses" validate constraint "Course_categoryId_fkey";

alter table "public"."note_chunks" add constraint "unique_course_section" UNIQUE using index "unique_course_section";

alter table "public"."pomodoro_sessions" add constraint "PomodoroSession_courseId_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL not valid;

alter table "public"."pomodoro_sessions" validate constraint "PomodoroSession_courseId_fkey";

alter table "public"."questions" add constraint "questions_chunk_id_fkey" FOREIGN KEY (chunk_id) REFERENCES public.note_chunks(id) ON DELETE SET NULL not valid;

alter table "public"."questions" validate constraint "questions_chunk_id_fkey";

alter table "public"."questions" add constraint "questions_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE not valid;

alter table "public"."questions" validate constraint "questions_course_id_fkey";

alter table "public"."questions" add constraint "questions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."questions" validate constraint "questions_created_by_fkey";

alter table "public"."subject_guidelines" add constraint "subject_guidelines_subject_name_key" UNIQUE using index "subject_guidelines_subject_name_key";

alter table "public"."user_achievements" add constraint "UserAchievement_userId_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_achievements" validate constraint "UserAchievement_userId_fkey";

alter table "public"."users" add constraint "User_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."users" validate constraint "User_id_fkey";

alter table "public"."video_progress" add constraint "VideoProgress_userId_videoId_key" UNIQUE using index "VideoProgress_userId_videoId_key";

alter table "public"."video_progress" add constraint "VideoProgress_videoId_fkey" FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE not valid;

alter table "public"."video_progress" validate constraint "VideoProgress_videoId_fkey";

alter table "public"."videos" add constraint "Video_courseId_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE not valid;

alter table "public"."videos" validate constraint "Video_courseId_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public."User" (id, email)
  values (new.id, new.email);
  return new;
end;
$function$
;

grant delete on table "public"."categories" to "anon";

grant insert on table "public"."categories" to "anon";

grant references on table "public"."categories" to "anon";

grant select on table "public"."categories" to "anon";

grant trigger on table "public"."categories" to "anon";

grant truncate on table "public"."categories" to "anon";

grant update on table "public"."categories" to "anon";

grant delete on table "public"."categories" to "authenticated";

grant insert on table "public"."categories" to "authenticated";

grant references on table "public"."categories" to "authenticated";

grant select on table "public"."categories" to "authenticated";

grant trigger on table "public"."categories" to "authenticated";

grant truncate on table "public"."categories" to "authenticated";

grant update on table "public"."categories" to "authenticated";

grant delete on table "public"."categories" to "service_role";

grant insert on table "public"."categories" to "service_role";

grant references on table "public"."categories" to "service_role";

grant select on table "public"."categories" to "service_role";

grant trigger on table "public"."categories" to "service_role";

grant truncate on table "public"."categories" to "service_role";

grant update on table "public"."categories" to "service_role";

grant delete on table "public"."courses" to "anon";

grant insert on table "public"."courses" to "anon";

grant references on table "public"."courses" to "anon";

grant select on table "public"."courses" to "anon";

grant trigger on table "public"."courses" to "anon";

grant truncate on table "public"."courses" to "anon";

grant update on table "public"."courses" to "anon";

grant delete on table "public"."courses" to "authenticated";

grant insert on table "public"."courses" to "authenticated";

grant references on table "public"."courses" to "authenticated";

grant select on table "public"."courses" to "authenticated";

grant trigger on table "public"."courses" to "authenticated";

grant truncate on table "public"."courses" to "authenticated";

grant update on table "public"."courses" to "authenticated";

grant delete on table "public"."courses" to "service_role";

grant insert on table "public"."courses" to "service_role";

grant references on table "public"."courses" to "service_role";

grant select on table "public"."courses" to "service_role";

grant trigger on table "public"."courses" to "service_role";

grant truncate on table "public"."courses" to "service_role";

grant update on table "public"."courses" to "service_role";

grant select on table "public"."note_chunks" to "anon";

grant select on table "public"."note_chunks" to "authenticated";

grant delete on table "public"."pomodoro_sessions" to "anon";

grant insert on table "public"."pomodoro_sessions" to "anon";

grant references on table "public"."pomodoro_sessions" to "anon";

grant select on table "public"."pomodoro_sessions" to "anon";

grant trigger on table "public"."pomodoro_sessions" to "anon";

grant truncate on table "public"."pomodoro_sessions" to "anon";

grant update on table "public"."pomodoro_sessions" to "anon";

grant delete on table "public"."pomodoro_sessions" to "authenticated";

grant insert on table "public"."pomodoro_sessions" to "authenticated";

grant references on table "public"."pomodoro_sessions" to "authenticated";

grant select on table "public"."pomodoro_sessions" to "authenticated";

grant trigger on table "public"."pomodoro_sessions" to "authenticated";

grant truncate on table "public"."pomodoro_sessions" to "authenticated";

grant update on table "public"."pomodoro_sessions" to "authenticated";

grant delete on table "public"."pomodoro_sessions" to "service_role";

grant insert on table "public"."pomodoro_sessions" to "service_role";

grant references on table "public"."pomodoro_sessions" to "service_role";

grant select on table "public"."pomodoro_sessions" to "service_role";

grant trigger on table "public"."pomodoro_sessions" to "service_role";

grant truncate on table "public"."pomodoro_sessions" to "service_role";

grant update on table "public"."pomodoro_sessions" to "service_role";

grant delete on table "public"."questions" to "anon";

grant insert on table "public"."questions" to "anon";

grant select on table "public"."questions" to "anon";

grant update on table "public"."questions" to "anon";

grant delete on table "public"."questions" to "authenticated";

grant insert on table "public"."questions" to "authenticated";

grant select on table "public"."questions" to "authenticated";

grant update on table "public"."questions" to "authenticated";

grant delete on table "public"."questions" to "service_role";

grant insert on table "public"."questions" to "service_role";

grant select on table "public"."questions" to "service_role";

grant update on table "public"."questions" to "service_role";

grant select on table "public"."subject_guidelines" to "anon";

grant select on table "public"."subject_guidelines" to "authenticated";

grant select on table "public"."subject_guidelines" to "service_role";

grant delete on table "public"."user_achievements" to "anon";

grant insert on table "public"."user_achievements" to "anon";

grant references on table "public"."user_achievements" to "anon";

grant select on table "public"."user_achievements" to "anon";

grant trigger on table "public"."user_achievements" to "anon";

grant truncate on table "public"."user_achievements" to "anon";

grant update on table "public"."user_achievements" to "anon";

grant delete on table "public"."user_achievements" to "authenticated";

grant insert on table "public"."user_achievements" to "authenticated";

grant references on table "public"."user_achievements" to "authenticated";

grant select on table "public"."user_achievements" to "authenticated";

grant trigger on table "public"."user_achievements" to "authenticated";

grant truncate on table "public"."user_achievements" to "authenticated";

grant update on table "public"."user_achievements" to "authenticated";

grant delete on table "public"."user_achievements" to "service_role";

grant insert on table "public"."user_achievements" to "service_role";

grant references on table "public"."user_achievements" to "service_role";

grant select on table "public"."user_achievements" to "service_role";

grant trigger on table "public"."user_achievements" to "service_role";

grant truncate on table "public"."user_achievements" to "service_role";

grant update on table "public"."user_achievements" to "service_role";

grant select on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

grant delete on table "public"."video_progress" to "anon";

grant insert on table "public"."video_progress" to "anon";

grant references on table "public"."video_progress" to "anon";

grant select on table "public"."video_progress" to "anon";

grant trigger on table "public"."video_progress" to "anon";

grant truncate on table "public"."video_progress" to "anon";

grant update on table "public"."video_progress" to "anon";

grant delete on table "public"."video_progress" to "authenticated";

grant insert on table "public"."video_progress" to "authenticated";

grant references on table "public"."video_progress" to "authenticated";

grant select on table "public"."video_progress" to "authenticated";

grant trigger on table "public"."video_progress" to "authenticated";

grant truncate on table "public"."video_progress" to "authenticated";

grant update on table "public"."video_progress" to "authenticated";

grant delete on table "public"."video_progress" to "service_role";

grant insert on table "public"."video_progress" to "service_role";

grant references on table "public"."video_progress" to "service_role";

grant select on table "public"."video_progress" to "service_role";

grant trigger on table "public"."video_progress" to "service_role";

grant truncate on table "public"."video_progress" to "service_role";

grant update on table "public"."video_progress" to "service_role";

grant delete on table "public"."videos" to "anon";

grant insert on table "public"."videos" to "anon";

grant references on table "public"."videos" to "anon";

grant select on table "public"."videos" to "anon";

grant trigger on table "public"."videos" to "anon";

grant truncate on table "public"."videos" to "anon";

grant update on table "public"."videos" to "anon";

grant delete on table "public"."videos" to "authenticated";

grant insert on table "public"."videos" to "authenticated";

grant references on table "public"."videos" to "authenticated";

grant select on table "public"."videos" to "authenticated";

grant trigger on table "public"."videos" to "authenticated";

grant truncate on table "public"."videos" to "authenticated";

grant update on table "public"."videos" to "authenticated";

grant delete on table "public"."videos" to "service_role";

grant insert on table "public"."videos" to "service_role";

grant references on table "public"."videos" to "service_role";

grant select on table "public"."videos" to "service_role";

grant trigger on table "public"."videos" to "service_role";

grant truncate on table "public"."videos" to "service_role";

grant update on table "public"."videos" to "service_role";


  create policy "Anyone can read categories"
  on "public"."categories"
  as permissive
  for select
  to public
using (true);



  create policy "Allow public read access on Course"
  on "public"."courses"
  as permissive
  for select
  to public
using (true);



  create policy "Anyone can read courses"
  on "public"."courses"
  as permissive
  for select
  to public
using (true);



  create policy "Anyone can read note_chunks"
  on "public"."note_chunks"
  as permissive
  for select
  to public
using (true);



  create policy "Enable read access for everyone"
  on "public"."note_chunks"
  as permissive
  for select
  to public
using (true);



  create policy "Users can manage their own sessions"
  on "public"."pomodoro_sessions"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "Users manage own sessions"
  on "public"."pomodoro_sessions"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "Allow public read access"
  on "public"."questions"
  as permissive
  for select
  to public
using (true);



  create policy "Anyone can view questions"
  on "public"."questions"
  as permissive
  for select
  to public
using (true);



  create policy "Enable insert for authenticated users users"
  on "public"."questions"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Enable read access for all users"
  on "public"."questions"
  as permissive
  for select
  to public
using (true);



  create policy "Users can delete their own questions"
  on "public"."questions"
  as permissive
  for delete
  to public
using ((auth.uid() = created_by));



  create policy "Users can insert their own questions"
  on "public"."questions"
  as permissive
  for insert
  to public
with check ((auth.uid() = created_by));



  create policy "Users can update their own questions"
  on "public"."questions"
  as permissive
  for update
  to public
using ((auth.uid() = created_by));



  create policy "Anyone can read subject_guidelines"
  on "public"."subject_guidelines"
  as permissive
  for select
  to public
using (true);



  create policy "Allow insert for owners"
  on "public"."user_achievements"
  as permissive
  for insert
  to authenticated, anon
with check ((auth.uid() = user_id));



  create policy "Allow select for owners"
  on "public"."user_achievements"
  as permissive
  for select
  to authenticated, anon
using ((auth.uid() = user_id));



  create policy "Allow update for owners"
  on "public"."user_achievements"
  as permissive
  for update
  to authenticated, anon
using ((auth.uid() = user_id));



  create policy "Users can delete their own achievements"
  on "public"."user_achievements"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own achievements"
  on "public"."user_achievements"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can manage their own achievements"
  on "public"."user_achievements"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own achievements"
  on "public"."user_achievements"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users manage own achievements"
  on "public"."user_achievements"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert own profile"
  on "public"."users"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = id));



  create policy "Users can update own profile"
  on "public"."users"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id));



  create policy "Users can view own profile"
  on "public"."users"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Users can view their own profile"
  on "public"."users"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Users can delete their own video progress"
  on "public"."video_progress"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own video progress"
  on "public"."video_progress"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own video progress"
  on "public"."video_progress"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own video progress"
  on "public"."video_progress"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users manage own video_progress"
  on "public"."video_progress"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "Anyone can read videos"
  on "public"."videos"
  as permissive
  for select
  to public
using (true);


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


