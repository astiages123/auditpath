/*
  RLS POLICY CLEANUP AND CONSOLIDATION
  - This script removes redundant and overly permissive policies.
  - It establishes a "Target State" where each table has clear User and Service Role policies.
*/

-- 1. ai_generation_logs (Fixing Security Leak)
DROP POLICY IF EXISTS "Allow read access to all users" ON public.ai_generation_logs;
DROP POLICY IF EXISTS "Allow read access to all users" ON "public"."ai_generation_logs";
DROP POLICY IF EXISTS "Users can only access their own data" ON public.ai_generation_logs;
DROP POLICY IF EXISTS "Users can view their own logs" ON public.ai_generation_logs;
DROP POLICY IF EXISTS "Service Role Full Access" ON public.ai_generation_logs;
DROP POLICY IF EXISTS "Service role can insert logging" ON public.ai_generation_logs;
DROP POLICY IF EXISTS "Allow service_role full access" ON public.ai_generation_logs;

CREATE POLICY "ai_generation_logs_user_all" ON public.ai_generation_logs 
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_generation_logs_service_role" ON public.ai_generation_logs 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. exchange_rates (Consolidating permissive access)
DROP POLICY IF EXISTS "anon_read_rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "authenticated_manage_rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_admin_all" ON public.exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_auth_insert" ON public.exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_auth_update" ON public.exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_public_select" ON public.exchange_rates;
DROP POLICY IF EXISTS "service_role_manage_rates" ON public.exchange_rates;

CREATE POLICY "exchange_rates_read_all" ON public.exchange_rates 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "exchange_rates_manage_auth" ON public.exchange_rates 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "exchange_rates_service_role" ON public.exchange_rates 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. chunk_mastery (Cleanup)
DROP POLICY IF EXISTS "Users can only access their own data" ON public.chunk_mastery;
DROP POLICY IF EXISTS "Users can insert their own mastery" ON public.chunk_mastery;
DROP POLICY IF EXISTS "Users can manage own mastery" ON public.chunk_mastery;
DROP POLICY IF EXISTS "Users can update their own mastery" ON public.chunk_mastery;
DROP POLICY IF EXISTS "Users can view own mastery" ON public.chunk_mastery;
DROP POLICY IF EXISTS "Users can view their own mastery" ON public.chunk_mastery;

CREATE POLICY "chunk_mastery_user_all" ON public.chunk_mastery 
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chunk_mastery_service_role" ON public.chunk_mastery 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. video_progress (Cleanup)
DROP POLICY IF EXISTS "Users can only access their own data" ON public.video_progress;
DROP POLICY IF EXISTS "Users can delete their own video progress" ON public.video_progress;
DROP POLICY IF EXISTS "Users can insert their own video progress" ON public.video_progress;
DROP POLICY IF EXISTS "Users can update their own video progress" ON public.video_progress;
DROP POLICY IF EXISTS "Users can view their own video progress" ON public.video_progress;

CREATE POLICY "video_progress_user_all" ON public.video_progress 
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "video_progress_service_role" ON public.video_progress 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. user_quiz_progress (Cleanup)
DROP POLICY IF EXISTS "Users can only access their own data" ON public.user_quiz_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.user_quiz_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_quiz_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.user_quiz_progress;
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_quiz_progress;
DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_quiz_progress;

CREATE POLICY "user_quiz_progress_user_all" ON public.user_quiz_progress 
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_quiz_progress_service_role" ON public.user_quiz_progress 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. note_chunks (Cleanup)
DROP POLICY IF EXISTS "Allow read access to all users" ON public.note_chunks;
DROP POLICY IF EXISTS "Allow update for service role" ON public.note_chunks;
DROP POLICY IF EXISTS "Anyone can read note_chunks" ON public.note_chunks;
DROP POLICY IF EXISTS "Authenticated users can read note_chunks" ON public.note_chunks;
DROP POLICY IF EXISTS "Authenticated users can update note_chunks" ON public.note_chunks;
DROP POLICY IF EXISTS "Service Role Full Access" ON public.note_chunks;
DROP POLICY IF EXISTS "Service role has full access to note_chunks" ON public.note_chunks;
DROP POLICY IF EXISTS "service_role_unrestricted" ON public.note_chunks;

CREATE POLICY "note_chunks_read_all" ON public.note_chunks 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "note_chunks_service_role" ON public.note_chunks 
    FOR ALL TO service_role USING (true) WITH CHECK (true);
