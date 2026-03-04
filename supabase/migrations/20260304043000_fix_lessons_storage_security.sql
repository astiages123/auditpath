-- "lessons" bucket'ı için hatalı tanınmış herkese açık güncelleme (update) yetkisini kaldıran düzeltme.
-- Hedef: 20260301235936_remote_schema.sql dosyasındaki hatalı politika.

-- 1. Hatalı olan "Service role update access for lessons" politikasını sil.
-- Bu politika 20260301235936_remote_schema.sql dosyasında yanlışlıkla "to public" olarak tanımlandığı için güvenlik riski oluşturmaktaydı.
DROP POLICY IF EXISTS "Service role update access for lessons" ON "storage"."objects";

-- 2. "lessons" bucket'ı için güncelleme (update) yetkisini sadece "service_role" rolü ile sınırlandırarak yeniden oluştur.
-- Bu sayede normal kullanıcılar (anon/authenticated) dosyaları değiştiremez, sadece sunucu tarafındaki işlemler (service_role) bunu yapabilir.
CREATE POLICY "Service role update access for lessons"
ON "storage"."objects"
FOR UPDATE
TO service_role
USING (bucket_id = 'lessons'::text);

-- GÜVENLİK ETKİSİ: 
-- lessons bucket'ı için public update yetkisi kaldırıldı. 
-- Artık sadece internal sistemler (service_role) dosya güncelleyebilir.
-- Public ve Authenticated rolleri sadece "Public read access for lessons" politikası ile SELECT (okuma) yetkisine sahiptir.

-- ROLLBACK NOTU:
-- Değişikliği geri almak gerekirse:
-- DROP POLICY IF EXISTS "Service role update access for lessons" ON "storage"."objects";
-- CREATE POLICY "Service role update access for lessons" ON "storage"."objects" FOR UPDATE TO public USING (bucket_id = 'lessons');
