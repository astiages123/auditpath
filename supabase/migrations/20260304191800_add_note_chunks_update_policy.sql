-- Authenticated kullanıcıların note_chunks tablosunda ai_logic ve status sütunlarını güncellemesine izin ver
CREATE POLICY "note_chunks_authenticated_update"
ON public.note_chunks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
