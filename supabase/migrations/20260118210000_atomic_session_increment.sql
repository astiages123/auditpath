-- Atomic Session Increment RPC
-- Bu fonksiyon, course_session_counters tablosunda atomik işlem yaparak
-- race condition riskini ortadan kaldırır.

CREATE OR REPLACE FUNCTION increment_course_session(
  p_user_id uuid,
  p_course_id uuid
)
RETURNS TABLE (
  current_session int,
  is_new_session boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today date := current_date;
  v_existing_record record;
  v_new_session int;
  v_is_new boolean;
BEGIN
  -- Kaydı kilitleyerek al (FOR UPDATE)
  SELECT * INTO v_existing_record
  FROM course_session_counters
  WHERE user_id = p_user_id AND course_id = p_course_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_record.last_session_date < v_today THEN
      -- Yeni gün, session artır
      v_new_session := v_existing_record.current_session + 1;
      v_is_new := true;
      
      UPDATE course_session_counters
      SET current_session = v_new_session,
          last_session_date = v_today,
          updated_at = now()
      WHERE id = v_existing_record.id;
    ELSE
      -- Aynı gün, session koru
      v_new_session := v_existing_record.current_session;
      v_is_new := false;
      
      -- Metadata güncelle
      UPDATE course_session_counters
      SET updated_at = now()
      WHERE id = v_existing_record.id;
    END IF;
  ELSE
    -- Kayıt yok, oluştur (Session 1)
    v_new_session := 1;
    v_is_new := true;
    
    INSERT INTO course_session_counters (user_id, course_id, current_session, last_session_date)
    VALUES (p_user_id, p_course_id, v_new_session, v_today);
  END IF;

  RETURN QUERY SELECT v_new_session, v_is_new;
END;
$$;
