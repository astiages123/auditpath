-- Migration: Kullanılmayan generation_jobs Tablosunu Sil
-- Bu tablo hiçbir yerde kullanılmıyor ve silinebilir.

-- ====================================
-- GENERATION_JOBS TABLOSUNU SİL
-- ====================================
DROP TABLE IF EXISTS public.generation_jobs CASCADE;

-- Not: Bu tablonun rollback scripti implementation_plan.md dosyasında mevcut.
