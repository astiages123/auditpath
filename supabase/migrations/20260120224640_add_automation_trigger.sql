-- 1. Create a function to trigger the quiz-generator edge function
CREATE OR REPLACE FUNCTION public.trigger_quiz_generation()
RETURNS trigger AS $$
BEGIN
  -- Sadece durum PENDING olduğunda ve içerik hazır olduğunda tetikle
  IF (NEW.status = 'PENDING' AND NEW.is_ready = true) THEN
    PERFORM
      net.http_post(
        url := 'https://ccnvhimlbkkydpcqtraw.supabase.co/functions/v1/quiz-generator',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbnZoaW1sYmtreWRwY3F0cmF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk1NDQ0MSwiZXhwIjoyMDgzNTMwNDQxfQ.efhQYAZ4760Y5pbTTsnQ_7ll8Jo0vOORHQ92Vpt4t-8'
        ),
        body := jsonb_build_object('chunkId', NEW.id)
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS trigger_quiz_generation_on_chunk ON public.note_chunks;
CREATE TRIGGER trigger_quiz_generation_on_chunk
AFTER INSERT OR UPDATE ON public.note_chunks
FOR EACH ROW
EXECUTE FUNCTION public.trigger_quiz_generation();
