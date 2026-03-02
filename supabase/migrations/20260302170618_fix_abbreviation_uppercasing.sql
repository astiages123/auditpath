-- Kısaltmaları ve Teknik Terimleri Büyük Harfe Çevirme Migrasyonu
-- Oluşturulma Tarihi: 2026-03-02

-- 1. Videolar Tablosundaki Başlıkları Güncelleme
UPDATE public.videos 
SET title = regexp_replace(title, '\y(is|lm|ad|as|cmk|mgk|bdt|fifo|lifo|öbt|ebob|ekok|iyuk|yks|dgs|ales|kpss|öabt|tcmb|mb)\y', UPPER('\1'), 'gi')
WHERE title ~* '\y(is|lm|ad|as|cmk|mgk|bdt|fifo|lifo|öbt|ebob|ekok|iyuk|yks|dgs|ales|kpss|öabt|tcmb|mb)\y';

-- 2. Özel Durumlar ve Karmaşık Yazımlar (Örn: Şi̇ö, İi̇ö)
UPDATE public.videos
SET title = replace(title, 'Şi̇ö', 'ŞİÖ')
WHERE title LIKE '%Şi̇ö%';

UPDATE public.videos
SET title = replace(title, 'İi̇ö', 'İİÖ')
WHERE title LIKE '%İi̇ö%';

-- 3. Konu Rehberlerindeki (Subject Guidelines) Talimatları Güncelleme
UPDATE public.subject_guidelines
SET instruction = regexp_replace(instruction, '\y(is|lm|ad|as|cmk|mgk|bdt|fifo|lifo|öbt|ebob|ekok|iyuk|yks|dgs|ales|kpss|öabt|tcmb|mb)\y', UPPER('\1'), 'gi')
WHERE instruction ~* '\y(is|lm|ad|as|cmk|mgk|bdt|fifo|lifo|öbt|ebob|ekok|iyuk|yks|dgs|ales|kpss|öabt|tcmb|mb)\y';

-- 4. Konu Rehberlerindeki Özel İsimleri (Ebob, Ekok, İyuk vb.) Büyük Harfe Çevirme
UPDATE public.subject_guidelines
SET instruction = replace(instruction, 'İyuk', 'İYUK')
WHERE instruction LIKE '%İyuk%';

UPDATE public.subject_guidelines
SET instruction = replace(instruction, 'Ebob', 'EBOB')
WHERE instruction LIKE '%Ebob%';

UPDATE public.subject_guidelines
SET instruction = replace(instruction, 'Ekok', 'EKOK')
WHERE instruction LIKE '%Ekok%';
