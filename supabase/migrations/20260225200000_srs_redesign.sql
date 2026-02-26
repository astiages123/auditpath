-- ============================================================
-- SRS Redesign Migration
-- Date: 2026-02-25
-- ============================================================

-- ------------------------------------------------------------
-- 1. Arşiv tipindeki soruları sil
-- ------------------------------------------------------------
DELETE FROM questions WHERE usage_type = 'arsiv';


-- ------------------------------------------------------------
-- 2. question_usage_type enum'ından 'arsiv' değerini kaldır
--    Yeni enum: 'antrenman' | 'deneme'
-- ------------------------------------------------------------
ALTER TYPE question_usage_type RENAME TO question_usage_type_old;

CREATE TYPE question_usage_type AS ENUM ('antrenman', 'deneme');

ALTER TABLE questions ALTER COLUMN usage_type DROP DEFAULT;

ALTER TABLE questions
  ALTER COLUMN usage_type TYPE question_usage_type
    USING usage_type::text::question_usage_type;

ALTER TABLE questions ALTER COLUMN usage_type SET DEFAULT 'antrenman';

DROP TYPE question_usage_type_old;


-- ------------------------------------------------------------
-- 3. question_status enum'ına 'reviewing' ve 'mastered' ekle
-- ------------------------------------------------------------
ALTER TYPE question_status ADD VALUE IF NOT EXISTS 'reviewing';
ALTER TYPE question_status ADD VALUE IF NOT EXISTS 'mastered';


-- ------------------------------------------------------------
-- 4. question_status enum'ından 'pending_followup' ve 'archived'
--    değerlerini kaldır.
--    Yeni enum: 'active' | 'reviewing' | 'mastered'
--    (user_question_status tablosu şu an boş, veri migrasyonu gerekmez)
-- ------------------------------------------------------------
ALTER TYPE question_status RENAME TO question_status_old;

CREATE TYPE question_status AS ENUM ('active', 'reviewing', 'mastered');

ALTER TABLE user_question_status ALTER COLUMN status DROP DEFAULT;

-- user_question_status tablosunda question_status kullanan kolonu güncelle
ALTER TABLE user_question_status
  ALTER COLUMN status TYPE question_status
    USING status::text::question_status;

ALTER TABLE user_question_status ALTER COLUMN status SET DEFAULT 'active';

DROP TYPE question_status_old;


-- ------------------------------------------------------------
-- 5. user_question_status tablosuna rep_count kolonu ekle
-- ------------------------------------------------------------
ALTER TABLE user_question_status
  ADD COLUMN rep_count integer NOT NULL DEFAULT 0;


-- ------------------------------------------------------------
-- 6. user_question_status tablosundan consecutive_success kolonunu kaldır
-- ------------------------------------------------------------
ALTER TABLE user_question_status
  DROP COLUMN IF EXISTS consecutive_success;
