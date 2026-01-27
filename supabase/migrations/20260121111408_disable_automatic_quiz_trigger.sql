-- Disable the automatic trigger for quiz-generator edge function
-- We keep the function but remove the trigger to allow manual generation only

DROP TRIGGER IF EXISTS trigger_quiz_generation_on_chunk ON public.note_chunks;
DROP FUNCTION IF EXISTS public.trigger_quiz_generation();
