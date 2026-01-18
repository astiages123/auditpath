-- Create Enum Types
CREATE TYPE public.question_usage_type AS ENUM ('antrenman', 'arsiv', 'deneme');
CREATE TYPE public.bloom_level AS ENUM ('knowledge', 'application', 'analysis');

-- Add columns to questions table
ALTER TABLE public.questions
ADD COLUMN usage_type public.question_usage_type DEFAULT 'antrenman',
ADD COLUMN sequence_index INTEGER DEFAULT 1,
ADD COLUMN bloom_level public.bloom_level DEFAULT 'knowledge';

-- Add comment to explain sequence_index
COMMENT ON COLUMN public.questions.sequence_index IS 'Her usage_type için 1 den başlayan üretim sırası';
