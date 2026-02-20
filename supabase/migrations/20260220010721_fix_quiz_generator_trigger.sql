-- Eski trigger'ı kaldır (içinde hardcoded key vardı)
DROP TRIGGER IF EXISTS "quiz-generator-instant" ON "public"."note_chunks";

-- Eski fonksiyonu da kaldır (varsa)
DROP FUNCTION IF EXISTS "public"."trigger_quiz_generator"();

-- Vault'tan key okuyan yeni fonksiyonu oluştur
CREATE OR REPLACE FUNCTION "public"."trigger_quiz_generator"()
RETURNS trigger AS $$
DECLARE
  v_service_role_key TEXT;
  v_url TEXT;
BEGIN
  SELECT decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF v_service_role_key IS NULL THEN
    RAISE WARNING 'Vault secret "service_role_key" not found!';
    RETURN NEW;
  END IF;

  v_url := 'https://ccnvhimlbkkydpcqtraw.supabase.co/functions/v1/quiz-generator';

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object('record', row_to_json(NEW))
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Yeni güvenli trigger'ı oluştur
CREATE TRIGGER "quiz-generator-instant"
  AFTER INSERT OR UPDATE ON "public"."note_chunks"
  FOR EACH ROW EXECUTE FUNCTION "public"."trigger_quiz_generator"();
