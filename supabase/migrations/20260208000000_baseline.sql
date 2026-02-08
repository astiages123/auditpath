


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";








ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";






CREATE TYPE "public"."bloom_level" AS ENUM (
    'knowledge',
    'application',
    'analysis'
);


ALTER TYPE "public"."bloom_level" OWNER TO "postgres";


CREATE TYPE "public"."chunk_generation_status" AS ENUM (
    'DRAFT',
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'SYNCED'
);


ALTER TYPE "public"."chunk_generation_status" OWNER TO "postgres";


CREATE TYPE "public"."question_status" AS ENUM (
    'active',
    'archived',
    'pending_followup'
);


ALTER TYPE "public"."question_status" OWNER TO "postgres";


CREATE TYPE "public"."question_usage_type" AS ENUM (
    'antrenman',
    'arsiv',
    'deneme'
);


ALTER TYPE "public"."question_usage_type" OWNER TO "postgres";


CREATE TYPE "public"."quiz_response_type" AS ENUM (
    'correct',
    'incorrect',
    'blank'
);


ALTER TYPE "public"."quiz_response_type" OWNER TO "postgres";


CREATE TYPE "public"."validation_status" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE "public"."validation_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_course_content_version"("p_course_id" "uuid") RETURNS timestamp with time zone
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT MAX(last_synced_at)
  FROM note_chunks
  WHERE course_id = p_course_id;
$$;


ALTER FUNCTION "public"."get_course_content_version"("p_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_email_by_username"("username_input" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  found_email text;
BEGIN
  SELECT email INTO found_email
  FROM public.users
  WHERE username = username_input;
  
  RETURN found_email;
END;
$$;


ALTER FUNCTION "public"."get_email_by_username"("username_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.users (id, email, username)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'username'
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_course_session"("p_user_id" "uuid", "p_course_id" "uuid") RETURNS TABLE("current_session" integer, "is_new_session" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_today date := current_date;
  v_existing_record record;
  v_new_session int;
  v_is_new boolean;
BEGIN
  -- Kaydı kilitleyerek al (FOR UPDATE)
  SELECT * INTO v_existing_record
  FROM course_session_counters
  WHERE user_id = p_user_id AND course_id = p_course_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_record.last_session_date < v_today THEN
      -- Yeni gün, session artır
      v_new_session := v_existing_record.current_session + 1;
      v_is_new := true;
      
      UPDATE course_session_counters
      SET current_session = v_new_session,
          last_session_date = v_today,
          updated_at = now()
      WHERE id = v_existing_record.id;
    ELSE
      -- Aynı gün, session koru
      v_new_session := v_existing_record.current_session;
      v_is_new := false;
      
      -- Metadata güncelle
      UPDATE course_session_counters
      SET updated_at = now()
      WHERE id = v_existing_record.id;
    END IF;
  ELSE
    -- Kayıt yok, oluştur (Session 1)
    v_new_session := 1;
    v_is_new := true;
    
    INSERT INTO course_session_counters (user_id, course_id, current_session, last_session_date)
    VALUES (p_user_id, p_course_id, v_new_session, v_today);
  END IF;

  RETURN QUERY SELECT v_new_session, v_is_new;
END;
$$;


ALTER FUNCTION "public"."increment_course_session"("p_user_id" "uuid", "p_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_last_synced_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.last_synced_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_last_synced_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_generation_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "model" "text" NOT NULL,
    "usage_type" "text",
    "prompt_tokens" integer,
    "completion_tokens" integer,
    "cached_tokens" integer DEFAULT 0,
    "total_tokens" integer,
    "latency_ms" integer,
    "status" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "error_message" "text"
);


ALTER TABLE "public"."ai_generation_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "total_hours" numeric DEFAULT 0,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chunk_mastery" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "chunk_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "last_reviewed_session" integer DEFAULT 0,
    "total_questions_seen" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "mastery_score" integer DEFAULT 0 NOT NULL,
    "last_full_review_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chunk_mastery_mastery_score_check" CHECK ((("mastery_score" >= 0) AND ("mastery_score" <= 100)))
);


ALTER TABLE "public"."chunk_mastery" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_session_counters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "current_session" integer DEFAULT 0,
    "last_session_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."course_session_counters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "total_videos" integer DEFAULT 0,
    "total_hours" numeric DEFAULT 0,
    "playlist_url" "text",
    "category_id" "uuid",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "instructor" "text"
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."note_chunks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "course_name" "text" NOT NULL,
    "section_title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "chunk_order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "word_count" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "public"."chunk_generation_status" DEFAULT 'DRAFT'::"public"."chunk_generation_status",
    "sequence_order" integer DEFAULT 0 NOT NULL,
    "display_content" "text",
    "last_synced_at" timestamp with time zone DEFAULT "now"(),
    "density_score" double precision DEFAULT 1.0,
    "meaningful_word_count" integer DEFAULT 0,
    "target_count" integer
);

ALTER TABLE ONLY "public"."note_chunks" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."note_chunks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pomodoro_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "course_id" "uuid",
    "total_work_time" integer DEFAULT 0,
    "total_break_time" integer DEFAULT 0,
    "total_pause_time" integer DEFAULT 0,
    "timeline" "jsonb" DEFAULT '[]'::"jsonb",
    "started_at" timestamp with time zone NOT NULL,
    "ended_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "course_name" "text",
    "is_completed" boolean DEFAULT false,
    "pause_count" integer DEFAULT 0,
    "efficiency_score" double precision DEFAULT 0,
    "last_active_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pomodoro_sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pomodoro_sessions"."pause_count" IS 'Number of times the session was paused';



COMMENT ON COLUMN "public"."pomodoro_sessions"."efficiency_score" IS 'Efficiency = (work / (work + break + pause)) * 100';



COMMENT ON COLUMN "public"."pomodoro_sessions"."last_active_at" IS 'Last heartbeat timestamp for zombie session detection';



CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "chunk_id" "uuid",
    "section_title" "text" NOT NULL,
    "question_data" "jsonb" NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "usage_type" "public"."question_usage_type" DEFAULT 'antrenman'::"public"."question_usage_type",
    "bloom_level" "public"."bloom_level" DEFAULT 'knowledge'::"public"."bloom_level",
    "parent_question_id" "uuid",
    "evidence" "text",
    "concept_title" "text"
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."questions"."evidence" IS 'Kaynak metinden alıntı (groundedness kanıtı)';



CREATE TABLE IF NOT EXISTS "public"."subject_guidelines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_name" "text" NOT NULL,
    "instruction" "text" NOT NULL,
    "few_shot_example" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "bad_few_shot_example" "jsonb",
    "subject_code" "text"
);


ALTER TABLE "public"."subject_guidelines" OWNER TO "postgres";


COMMENT ON TABLE "public"."subject_guidelines" IS 'Per-subject AI prompting instructions and few-shot examples for KPSS quiz generation';



COMMENT ON COLUMN "public"."subject_guidelines"."subject_name" IS 'Course name matching note_chunks.course_name';



COMMENT ON COLUMN "public"."subject_guidelines"."instruction" IS 'Subject-specific prompting instructions for AI';



COMMENT ON COLUMN "public"."subject_guidelines"."few_shot_example" IS 'Example question in JSON format {q, o, a, exp}';



CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "user_id" "uuid" NOT NULL,
    "achievement_id" "text" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_celebrated" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_question_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "status" "public"."question_status" DEFAULT 'active'::"public"."question_status" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "consecutive_fails" integer DEFAULT 0,
    "next_review_at" timestamp with time zone,
    "next_review_session" integer,
    "consecutive_success" integer DEFAULT 0
);


ALTER TABLE "public"."user_question_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_quiz_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "chunk_id" "uuid",
    "course_id" "uuid" NOT NULL,
    "response_type" "public"."quiz_response_type" NOT NULL,
    "selected_answer" integer,
    "session_number" integer NOT NULL,
    "is_review_question" boolean DEFAULT false,
    "answered_at" timestamp with time zone DEFAULT "now"(),
    "time_spent_ms" integer,
    "ai_diagnosis" "text",
    "ai_insight" "text"
);


ALTER TABLE "public"."user_quiz_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "username" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_progress" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "video_id" "uuid",
    "completed" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."video_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."videos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "video_number" integer NOT NULL,
    "title" "text" NOT NULL,
    "duration" "text" NOT NULL,
    "duration_minutes" numeric DEFAULT 0,
    "course_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."videos" OWNER TO "postgres";


ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "Course_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pomodoro_sessions"
    ADD CONSTRAINT "PomodoroSession_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("user_id", "achievement_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_progress"
    ADD CONSTRAINT "VideoProgress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_progress"
    ADD CONSTRAINT "VideoProgress_userId_videoId_key" UNIQUE ("user_id", "video_id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "Video_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_generation_logs"
    ADD CONSTRAINT "ai_generation_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chunk_mastery"
    ADD CONSTRAINT "chunk_mastery_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chunk_mastery"
    ADD CONSTRAINT "chunk_mastery_user_id_chunk_id_key" UNIQUE ("user_id", "chunk_id");



ALTER TABLE ONLY "public"."course_session_counters"
    ADD CONSTRAINT "course_session_counters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_session_counters"
    ADD CONSTRAINT "course_session_counters_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."note_chunks"
    ADD CONSTRAINT "note_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subject_guidelines"
    ADD CONSTRAINT "subject_guidelines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subject_guidelines"
    ADD CONSTRAINT "subject_guidelines_subject_name_key" UNIQUE ("subject_name");



ALTER TABLE ONLY "public"."note_chunks"
    ADD CONSTRAINT "unique_course_section_chunk" UNIQUE ("course_id", "section_title", "sequence_order");



ALTER TABLE ONLY "public"."chunk_mastery"
    ADD CONSTRAINT "unique_user_chunk" UNIQUE ("user_id", "chunk_id");



ALTER TABLE ONLY "public"."user_question_status"
    ADD CONSTRAINT "user_question_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_question_status"
    ADD CONSTRAINT "user_question_status_user_id_question_id_key" UNIQUE ("user_id", "question_id");



ALTER TABLE ONLY "public"."user_quiz_progress"
    ADD CONSTRAINT "user_quiz_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



CREATE INDEX "idx_mastery_user_course" ON "public"."chunk_mastery" USING "btree" ("user_id", "course_id");



CREATE INDEX "idx_pomodoro_sessions_last_active_at" ON "public"."pomodoro_sessions" USING "btree" ("last_active_at") WHERE ("is_completed" = false);



CREATE INDEX "idx_pomodoro_sessions_user_id" ON "public"."pomodoro_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_pomodoro_sessions_user_started" ON "public"."pomodoro_sessions" USING "btree" ("user_id", "started_at");



CREATE INDEX "idx_progress_chunk_response" ON "public"."user_quiz_progress" USING "btree" ("chunk_id", "response_type");



CREATE INDEX "idx_progress_question" ON "public"."user_quiz_progress" USING "btree" ("question_id");



CREATE INDEX "idx_progress_session" ON "public"."user_quiz_progress" USING "btree" ("user_id", "course_id", "session_number");



CREATE INDEX "idx_progress_user_course" ON "public"."user_quiz_progress" USING "btree" ("user_id", "course_id");



CREATE INDEX "idx_questions_chunk_id" ON "public"."questions" USING "btree" ("chunk_id");



CREATE INDEX "idx_questions_concept_title" ON "public"."questions" USING "btree" ("concept_title");



CREATE INDEX "idx_questions_course_usage" ON "public"."questions" USING "btree" ("course_id", "usage_type");



CREATE INDEX "idx_questions_parent" ON "public"."questions" USING "btree" ("parent_question_id") WHERE ("parent_question_id" IS NOT NULL);



CREATE INDEX "idx_session_counters_user" ON "public"."course_session_counters" USING "btree" ("user_id");



CREATE INDEX "idx_user_question_status_session" ON "public"."user_question_status" USING "btree" ("user_id", "next_review_session");



CREATE INDEX "idx_user_question_status_user_status" ON "public"."user_question_status" USING "btree" ("user_id", "status");



CREATE INDEX "idx_video_progress_user_completed" ON "public"."video_progress" USING "btree" ("user_id", "completed_at");



CREATE INDEX "idx_video_progress_user_id" ON "public"."video_progress" USING "btree" ("user_id");



CREATE INDEX "idx_video_progress_user_video" ON "public"."video_progress" USING "btree" ("user_id", "video_id");



CREATE UNIQUE INDEX "subject_guidelines_subject_code_key" ON "public"."subject_guidelines" USING "btree" ("subject_code");



CREATE INDEX "user_question_status_next_review_idx" ON "public"."user_question_status" USING "btree" ("next_review_at");



CREATE OR REPLACE TRIGGER "quiz-generator-instant" AFTER INSERT OR UPDATE ON "public"."note_chunks" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://ccnvhimlbkkydpcqtraw.supabase.co/functions/v1/quiz-generator', 'POST', '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbnZoaW1sYmtreWRwY3F0cmF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk1NDQ0MSwiZXhwIjoyMDgzNTMwNDQxfQ.efhQYAZ4760Y5pbTTsnQ_7ll8Jo0vOORHQ92Vpt4t-8"}', '{}', '10000');



CREATE OR REPLACE TRIGGER "update_note_chunks_last_synced_at" BEFORE UPDATE ON "public"."note_chunks" FOR EACH ROW EXECUTE FUNCTION "public"."update_last_synced_at"();



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "Course_categoryId_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pomodoro_sessions"
    ADD CONSTRAINT "PomodoroSession_courseId_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "User_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_progress"
    ADD CONSTRAINT "VideoProgress_videoId_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "Video_courseId_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_generation_logs"
    ADD CONSTRAINT "ai_generation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."chunk_mastery"
    ADD CONSTRAINT "chunk_mastery_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "public"."note_chunks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chunk_mastery"
    ADD CONSTRAINT "chunk_mastery_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chunk_mastery"
    ADD CONSTRAINT "chunk_mastery_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_session_counters"
    ADD CONSTRAINT "course_session_counters_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_session_counters"
    ADD CONSTRAINT "course_session_counters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."note_chunks"
    ADD CONSTRAINT "note_chunks_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pomodoro_sessions"
    ADD CONSTRAINT "pomodoro_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "public"."note_chunks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_parent_question_id_fkey" FOREIGN KEY ("parent_question_id") REFERENCES "public"."questions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_question_status"
    ADD CONSTRAINT "user_question_status_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_question_status"
    ADD CONSTRAINT "user_question_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_quiz_progress"
    ADD CONSTRAINT "user_quiz_progress_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "public"."note_chunks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_quiz_progress"
    ADD CONSTRAINT "user_quiz_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_quiz_progress"
    ADD CONSTRAINT "user_quiz_progress_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_quiz_progress"
    ADD CONSTRAINT "user_quiz_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_progress"
    ADD CONSTRAINT "video_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow service_role full access" ON "public"."ai_generation_logs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow update for all users" ON "public"."note_chunks" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Anyone can read categories" ON "public"."categories" FOR SELECT USING (true);



CREATE POLICY "Anyone can read courses" ON "public"."courses" FOR SELECT USING (true);



CREATE POLICY "Anyone can read note_chunks" ON "public"."note_chunks" FOR SELECT USING (true);



CREATE POLICY "Anyone can read subject_guidelines" ON "public"."subject_guidelines" FOR SELECT USING (true);



CREATE POLICY "Anyone can read videos" ON "public"."videos" FOR SELECT USING (true);



CREATE POLICY "Anyone can view questions" ON "public"."questions" FOR SELECT USING (true);



CREATE POLICY "Service Role Full Access" ON "public"."ai_generation_logs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service Role Full Access" ON "public"."note_chunks" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can insert logging" ON "public"."ai_generation_logs" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Users can delete their own questions" ON "public"."questions" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete their own video progress" ON "public"."video_progress" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own progress" ON "public"."user_quiz_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own questions" ON "public"."questions" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert questions" ON "public"."questions" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can insert their own counters" ON "public"."course_session_counters" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own mastery" ON "public"."chunk_mastery" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own progress" ON "public"."user_quiz_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own video progress" ON "public"."video_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own mastery" ON "public"."chunk_mastery" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own achievements" ON "public"."user_achievements" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own question status" ON "public"."user_question_status" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own progress" ON "public"."user_quiz_progress" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own questions" ON "public"."questions" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own counters" ON "public"."course_session_counters" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own mastery" ON "public"."chunk_mastery" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own progress" ON "public"."user_quiz_progress" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own questions" ON "public"."questions" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own video progress" ON "public"."video_progress" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own mastery" ON "public"."chunk_mastery" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own progress" ON "public"."user_quiz_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own counters" ON "public"."course_session_counters" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own logs" ON "public"."ai_generation_logs" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own mastery" ON "public"."chunk_mastery" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own progress" ON "public"."user_quiz_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own video progress" ON "public"."video_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own sessions" ON "public"."pomodoro_sessions" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."ai_generation_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chunk_mastery" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_session_counters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."note_chunks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pomodoro_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_unrestricted" ON "public"."note_chunks" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."subject_guidelines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_question_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_quiz_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
















































































































































































































































































































































GRANT ALL ON FUNCTION "public"."get_course_content_version"("p_course_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_course_content_version"("p_course_id" "uuid") TO "service_role";












SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;












GRANT ALL ON TABLE "public"."ai_generation_logs" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."chunk_mastery" TO "authenticated";
GRANT ALL ON TABLE "public"."chunk_mastery" TO "service_role";



GRANT ALL ON TABLE "public"."course_session_counters" TO "authenticated";
GRANT ALL ON TABLE "public"."course_session_counters" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."note_chunks" TO "anon";
GRANT ALL ON TABLE "public"."note_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."note_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."pomodoro_sessions" TO "anon";
GRANT ALL ON TABLE "public"."pomodoro_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."pomodoro_sessions" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT SELECT ON TABLE "public"."subject_guidelines" TO "anon";
GRANT SELECT ON TABLE "public"."subject_guidelines" TO "authenticated";
GRANT SELECT ON TABLE "public"."subject_guidelines" TO "service_role";



GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."user_question_status" TO "authenticated";
GRANT ALL ON TABLE "public"."user_question_status" TO "service_role";



GRANT ALL ON TABLE "public"."user_quiz_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_quiz_progress" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."users" TO "authenticated";
GRANT SELECT ON TABLE "public"."users" TO "anon";



GRANT ALL ON TABLE "public"."video_progress" TO "anon";
GRANT ALL ON TABLE "public"."video_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."video_progress" TO "service_role";



GRANT ALL ON TABLE "public"."videos" TO "anon";
GRANT ALL ON TABLE "public"."videos" TO "authenticated";
GRANT ALL ON TABLE "public"."videos" TO "service_role";


































