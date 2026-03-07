-- 1. note_chunks tablosundaki genel güncelleme yetkisini kaldır
DROP POLICY IF EXISTS "note_chunks_authenticated_update" ON public.note_chunks;
-- Not: note_chunks tablosunda zaten service_role için tam yetki var (note_chunks_service_role), 
-- bu yüzden Edge Function'lar çalışmaya devam edecektir.

-- 2. subject_guidelines tablosunu gizle (Sadece SELECT yetkisi herkese açıktı)
DROP POLICY IF EXISTS "Anyone can read subject_guidelines" ON public.subject_guidelines;
-- Sadece service_role ve admin erişebilsin
ALTER TABLE public.subject_guidelines FORCE ROW LEVEL SECURITY;
CREATE POLICY "subject_guidelines_service_role" ON public.subject_guidelines 
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Security Definer Fonksiyonların Yetkilerini Kısıtla
-- PostgreSQL varsayılan olarak SECURITY DEFINER fonksiyonlara PUBLIC EXECUTE yetkisi verir.
-- Bu yetkileri geri alıp sadece gerekli rollere tanımlıyoruz.

REVOKE EXECUTE ON FUNCTION public.check_and_increment_quota(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_quota(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_course_session(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_course_session(uuid, uuid) TO service_role;

-- 4. Storage Güvenlik Politikaları (lessons, pdfs, AuditPath)
-- Okuma (SELECT) yetkisi statik linkler için public kalacak, ancak yükleme/silme kısıtlanacak.

-- 'lessons' bucket
CREATE POLICY "lessons_public_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'lessons');
CREATE POLICY "lessons_admin_all" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'lessons') WITH CHECK (bucket_id = 'lessons');

-- 'pdfs' bucket
CREATE POLICY "pdfs_public_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'pdfs');
CREATE POLICY "pdfs_admin_all" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'pdfs') WITH CHECK (bucket_id = 'pdfs');

-- 'AuditPath' bucket
CREATE POLICY "AuditPath_public_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'AuditPath');
CREATE POLICY "AuditPath_admin_all" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'AuditPath') WITH CHECK (bucket_id = 'AuditPath');
