-- Remove user_id from note_chunks and fix RLS

-- Drop RLS policies depending on user_id
DROP POLICY IF EXISTS "Users can update their own chunks" ON public.note_chunks;
DROP POLICY IF EXISTS "Users can update own chunks" ON public.note_chunks;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.note_chunks;
DROP POLICY IF EXISTS "Allow update for all users" ON public.note_chunks;
DROP POLICY IF EXISTS "note_chunks_admin_all" ON public.note_chunks;
DROP POLICY IF EXISTS "note_chunks_public_select" ON public.note_chunks;

-- Drop user_id column
ALTER TABLE public.note_chunks DROP COLUMN IF EXISTS user_id;

-- Create correct RLS policies for note_chunks
-- Service role has full access
CREATE POLICY "Service role has full access to note_chunks" 
    ON public.note_chunks FOR ALL 
    TO service_role 
    USING (true) WITH CHECK (true);

-- Authenticated users (and anonymous if necessary) can read
CREATE POLICY "Authenticated users can read note_chunks" 
    ON public.note_chunks FOR SELECT 
    TO authenticated 
    USING (true);

-- Apply changes
ALTER TABLE public.note_chunks ENABLE ROW LEVEL SECURITY;
