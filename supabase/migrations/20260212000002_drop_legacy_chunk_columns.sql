-- 1. ADIM: Veri Güvenliği (Data Migration)
-- Eğer ai_logic içinde kota yoksa ve target_count doluysa, veriyi ai_logic içine taşıyoruz.
-- Bu işlem, eski verilerin sistemde "0" soru olarak görünmesini engeller.

UPDATE public.note_chunks
SET ai_logic = jsonb_set(
    COALESCE(ai_logic, '{"reasoning": "", "suggested_quotas": {"arsiv": 0, "deneme": 0, "antrenman": 0}}'::jsonb),
    '{suggested_quotas}',
    jsonb_build_object(
        'antrenman', GREATEST(5, CEIL((target_count)::float * 0.25)),
        'arsiv', GREATEST(1, CEIL((target_count)::float * 0.10)),
        'deneme', GREATEST(1, CEIL((target_count)::float * 0.10))
    )
)
WHERE (ai_logic->'suggested_quotas'->>'antrenman' IS NULL OR ai_logic->'suggested_quotas'->>'antrenman' = '0')
  AND target_count IS NOT NULL 
  AND target_count > 0;

---

-- 2. ADIM: Sütunları Temizleme
-- Bağımlılıkları kontrol ederek sütunları siliyoruz.

ALTER TABLE public.note_chunks 
DROP COLUMN IF EXISTS word_count,
DROP COLUMN IF EXISTS target_count;

---

-- 3. ADIM: Bilgilendirme
COMMENT ON COLUMN public.note_chunks.ai_logic IS 'Bilişsel kotalar ve AI mantığı. word_count ve target_count sütunlarının yerini almıştır.';