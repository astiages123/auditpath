-- Fix RLS for note_chunks to allow authenticated users to update metadata, ai_logic, and status.
-- Previously, it was locked to user_id, which is NULL for chunks synced from Notion.

DROP POLICY IF EXISTS "Users can update their own chunks" ON public.note_chunks;
CREATE POLICY "Enable update for authenticated users" ON public.note_chunks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
