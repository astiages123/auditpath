-- Storage bucket 'lessons' oluşturma
-- Bu migration production'da çalıştırılabilir veya Dashboard'dan manuel oluşturulabilir

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'lessons',
    'lessons',
    true,  -- Public bucket
    52428800,  -- 50MB limit
    ARRAY['image/webp', 'image/png', 'image/jpeg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Herkes okuyabilir
CREATE POLICY "Public read access for lessons" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'lessons');

-- RLS Policy: Service role ile yazılabilir (script kullanımı için)
CREATE POLICY "Service role write access for lessons" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'lessons');

CREATE POLICY "Service role update access for lessons" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'lessons');
