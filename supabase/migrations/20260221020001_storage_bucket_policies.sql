-- Fix lessons bucket public write permission

-- Note: We only limit modifications.
-- Supabase typical object policy structure 

-- Restrict who can INSERT, UPDATE, DELETE to service_role in lessons bucket
-- We first drop potentially broad policies
DROP POLICY IF EXISTS "Public write access for lessons" ON storage.objects;
DROP POLICY IF EXISTS "Public update access for lessons" ON storage.objects;
DROP POLICY IF EXISTS "Public insert access for lessons" ON storage.objects;
DROP POLICY IF EXISTS "Service role write access for lessons" ON storage.objects;

-- Create clear policies for service role
CREATE POLICY "Service role write access for lessons"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'lessons')
WITH CHECK (bucket_id = 'lessons');

-- Keep read access public
DROP POLICY IF EXISTS "Public read access for lessons" ON storage.objects;
CREATE POLICY "Public read access for lessons"
ON storage.objects FOR SELECT
USING (bucket_id = 'lessons');
