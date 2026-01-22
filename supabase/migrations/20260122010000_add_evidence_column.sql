-- Migration: Add evidence column to questions table
-- Required for Groundedness validation - stores source text quotes

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS evidence text;

COMMENT ON COLUMN public.questions.evidence IS 'Kaynak metinden alıntı (groundedness kanıtı)';
