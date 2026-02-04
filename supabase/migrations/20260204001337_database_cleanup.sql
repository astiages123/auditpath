-- Migration: Database Cleanup Audit (Fixed for Dependencies)
-- Description: Removing redundant columns and tables, handling RLS dependencies.
-- Created: 2026-02-04

-- 1. Bağımlılıkları Temizle (Kritik Adım)
-- 'is_global' kolonunu kullanan politikayı kaldırıyoruz.
DROP POLICY IF EXISTS "Users can view global and own questions" ON "public"."questions";

-- 2. Eğer kullanıcıların soruları görmeye devam etmesini istiyorsan, 
-- is_global içermeyen yeni bir politika ekleyelim (Opsiyonel - Uygulama mantığına göre):
-- CREATE POLICY "Users can view all questions" ON "public"."questions" FOR SELECT USING (true);

-- 3. Redundant (Gereksiz) Kolonların Kaldırılması
ALTER TABLE "public"."note_chunks" DROP COLUMN IF EXISTS "is_ready";

-- 4. "Hayalet" Tabloların ve İlgili Enum'ların Kaldırılması
DROP TABLE IF EXISTS "public"."weekly_schedule";
DROP TABLE IF EXISTS "public"."question_generation_logs";
DROP TYPE IF EXISTS "public"."generation_log_step";

-- 5. Atıl Yönetim Alanlarının Kaldırılması
-- Artık is_global üzerindeki bağımlılık kalktığı için bu işlem başarıyla tamamlanacak.
ALTER TABLE "public"."questions" 
  DROP COLUMN IF EXISTS "is_global",
  DROP COLUMN IF EXISTS "quality_score",
  DROP COLUMN IF EXISTS "validator_feedback",
  DROP COLUMN IF EXISTS "validation_status";