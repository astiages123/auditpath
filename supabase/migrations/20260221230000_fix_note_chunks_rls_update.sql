-- Allow authenticated users to update note_chunks (required for quiz generation results)
DROP POLICY IF EXISTS "Authenticated users can update note_chunks" ON public.note_chunks;

CREATE POLICY "Authenticated users can update note_chunks" 
    ON public.note_chunks FOR UPDATE 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

-- Also ensure service role still has everything
DROP POLICY IF EXISTS "Service role has full access to note_chunks" ON public.note_chunks;
CREATE POLICY "Service role has full access to note_chunks" 
    ON public.note_chunks FOR ALL 
    TO service_role 
    USING (true) WITH CHECK (true);
