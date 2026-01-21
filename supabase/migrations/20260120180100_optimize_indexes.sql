-- Migration: Duplicate İndeks Temizliği ve Eksik İndekslerin Eklenmesi
-- Bu migration, duplicate indeksleri temizler ve eksik indeksleri ekler.

-- ====================================
-- 1. DUPLICATE İNDEKS TEMİZLİĞİ
-- ====================================
-- pomodoro_sessions tablosunda aynı sütunlar için iki indeks var
-- idx_pomodoro_sessions_user_started kalacak
DROP INDEX IF EXISTS idx_pomodoro_session_user_started;

-- ====================================
-- 2. EKSİK İNDEKSLERİN EKLENMESİ
-- ====================================

-- questions tablosu için chunk_id indeksi (sık sorgulanıyor)
CREATE INDEX IF NOT EXISTS idx_questions_chunk_id 
  ON public.questions (chunk_id);

-- questions tablosu için course_id + usage_type composite indeksi
-- Quiz sorgularında sıkça kullanılıyor
CREATE INDEX IF NOT EXISTS idx_questions_course_usage 
  ON public.questions (course_id, usage_type);

-- video_logs tablosu için user_id + created_at indeksi
-- Günlük istatistik sorgularında kullanılıyor
CREATE INDEX IF NOT EXISTS idx_video_logs_user_created 
  ON public.video_logs (user_id, created_at);

-- user_question_status için user_id + status composite indeksi
-- Status filtreleme sorgularında kullanılıyor
CREATE INDEX IF NOT EXISTS idx_user_question_status_user_status 
  ON public.user_question_status (user_id, status);
