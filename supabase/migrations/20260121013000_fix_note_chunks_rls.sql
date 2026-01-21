-- Service Role'e note_chunks üzerinde tam yetki ver
CREATE POLICY "Service Role Full Access" ON "public"."note_chunks"
AS PERMISSIVE FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
