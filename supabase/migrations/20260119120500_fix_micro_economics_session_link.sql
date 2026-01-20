DO $$
DECLARE
  v_user_id uuid := 'f63e5a09-7401-481d-9cfb-c1bb1940a999';
  v_course_id uuid;
  v_course_name text;
BEGIN
  -- Attempt to find the course by slug
  SELECT id, name INTO v_course_id, v_course_name 
  FROM courses 
  WHERE course_slug = 'mikro-iktisat'
  LIMIT 1;

  -- If still not found by slug, try name with looser match
  IF v_course_id IS NULL THEN
      SELECT id, name INTO v_course_id, v_course_name 
      FROM courses 
      WHERE name ILIKE '%Mikro%' AND name ILIKE '%iktisat%'
      LIMIT 1;
  END IF;

  IF v_course_id IS NOT NULL THEN
     -- Update the session(s) for this user that have NULL course_id and were created today
     UPDATE pomodoro_sessions
     SET course_id = v_course_id,
         course_name = v_course_name
     WHERE user_id = v_user_id
       AND course_id IS NULL
       AND created_at > (now() - interval '1 hour');
       
     RAISE NOTICE 'Updated session with course: %', v_course_name;
  ELSE
     RAISE NOTICE 'Course Mikro Iktisat (slug: mikro-iktisat) still NOT found.';
  END IF;

END $$;
