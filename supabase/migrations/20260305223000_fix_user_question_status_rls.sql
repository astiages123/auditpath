-- user_question_status tablosundaki RLS hatasını fiksleme
-- Bu tablo için RLS aktif ancak herhangi bir politika tanımlanmamıştı.

-- 1. Tablo üzerindeki kısıtlamaları ve mevcut politikaları temizleyelim (varsa)
DROP POLICY IF EXISTS "Users can manage their own question status" ON public.user_question_status;
DROP POLICY IF EXISTS "user_question_status_service_role" ON public.user_question_status;
DROP POLICY IF EXISTS "user_question_status_user_access" ON public.user_question_status;

-- 2. Yeni politikaları ekleyelim
CREATE POLICY "user_question_status_user_access"
ON public.user_question_status
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_question_status_service_role"
ON public.user_question_status
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Tablo için RLS'in açık olduğundan emin olalım
ALTER TABLE public.user_question_status ENABLE ROW LEVEL SECURITY;

-- 4. chunk_mastery tablosu için de eksik olabilecek bir politika varsa (UPSERT için) kontrol edelim/ekleyelim
-- Mevcut politikalar SELECT ve ALL (auth.uid() = user_id) şeklindeydi ancak isimlendirme karışıklığı olabilir.

DROP POLICY IF EXISTS "chunk_mastery_user_access" ON public.chunk_mastery;

CREATE POLICY "chunk_mastery_user_access"
ON public.chunk_mastery
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
