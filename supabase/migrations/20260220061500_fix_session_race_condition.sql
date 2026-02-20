-- Update increment_course_session to be thread-safe (idempotent)
CREATE OR REPLACE FUNCTION "public"."increment_course_session"("p_user_id" "uuid", "p_course_id" "uuid") RETURNS TABLE("current_session" integer, "is_new_session" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_today date := current_date;
  v_row record;
BEGIN
  -- Use INSERT ON CONFLICT to ensure row exists and lock it
  -- We don't increment yet, just ensure existence and touch updated_at
  INSERT INTO course_session_counters (user_id, course_id, current_session, last_session_date, updated_at)
  VALUES (p_user_id, p_course_id, 1, v_today, now())
  ON CONFLICT (user_id, course_id) DO UPDATE
  SET updated_at = now()
  RETURNING * INTO v_row;

  IF v_row.last_session_date < v_today THEN
    -- New day, increment session
    UPDATE course_session_counters
    SET current_session = v_row.current_session + 1,
        last_session_date = v_today,
        updated_at = now()
    WHERE id = v_row.id
    RETURNING * INTO v_row;
    
    RETURN QUERY SELECT v_row.current_session, true;
  ELSE
    -- Same day, return current session
    -- Note: If it was just inserted, current_session is 1 and last_session_date is today.
    -- If it was already today, we just return the existing value.
    -- If it was just inserted (first time EVER), is_new_session should be true?
    -- Actually, the original logic had 'v_is_new := true' for fresh records.
    -- Let's check if it was truly a new insert.
    -- We can check if created_at is very recent, but better yet:
    IF v_row.current_session = 1 AND v_row.created_at >= now() - interval '1 second' THEN
       RETURN QUERY SELECT v_row.current_session, true;
    ELSE
       RETURN QUERY SELECT v_row.current_session, false;
    END IF;
  END IF;
END;
$$;
