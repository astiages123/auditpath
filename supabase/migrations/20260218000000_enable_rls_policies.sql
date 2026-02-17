-- RLS (Row Level Security) Migration for AuditPath
-- Enables RLS on all tables and defines refined access policies.

-- CATEGORY 1: PRIVATE DATA (Owner only)
-- user_quiz_progress, user_question_status, chunk_mastery, course_session_counters, ai_generation_logs, pomodoro_sessions, user_achievements, video_progress

DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN SELECT table_name 
             FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name IN (
                 'user_quiz_progress', 
                 'user_question_status', 
                 'chunk_mastery', 
                 'course_session_counters', 
                 'ai_generation_logs', 
                 'pomodoro_sessions', 
                 'user_achievements', 
                 'video_progress'
             )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Users can only access their own data" ON public.%I;', t);
        EXECUTE format('CREATE POLICY "Users can only access their own data" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);', t);
    END LOOP;
END $$;

-- CATEGORY 2: PUBLIC/AUTHENTICATED CONTENT (Everyone can read, Admin/System can write)
-- courses, note_chunks, categories, exchange_rates, subject_guidelines, videos

DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN SELECT table_name 
             FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name IN (
                 'courses', 
                 'note_chunks', 
                 'categories', 
                 'exchange_rates', 
                 'subject_guidelines', 
                 'videos'
             )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated read access" ON public.%I;', t);
        EXECUTE format('CREATE POLICY "Allow authenticated read access" ON public.%I FOR SELECT TO authenticated USING (true);', t);
    END LOOP;
END $$;

-- CATEGORY 3: SPECIAL TABLE - QUESTIONS
-- Everyone can read, but only the creator can write follow-ups/custom questions.

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read access" ON public.questions;
CREATE POLICY "Allow authenticated read access" ON public.questions 
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow creator to insert questions" ON public.questions;
CREATE POLICY "Allow creator to insert questions" ON public.questions 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- EXCEPTIONS: users table
-- Users should only access their own profile.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users 
FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users 
FOR UPDATE TO authenticated USING (auth.uid() = id);
