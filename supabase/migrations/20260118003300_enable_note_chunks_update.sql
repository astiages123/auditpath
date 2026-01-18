-- Allow authenticated users to update note_chunks (for saving metadata/concept maps)
CREATE POLICY "Allow authenticated users to update note_chunks"
ON "public"."note_chunks"
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
