DO $$
DECLARE
  v_user_id uuid := 'f63e5a09-7401-481d-9cfb-c1bb1940a999';
  v_course_id uuid;
  v_course_name text;
  v_timeline jsonb;
  v_date date := '2026-01-19';
  v_total_work int := 249; -- 50+50+60+57+32
  v_total_break int := 41; -- 15+8+10+8
  v_total_pause int := 0;
BEGIN
  -- Attempt to find the course
  SELECT id, name INTO v_course_id, v_course_name 
  FROM courses 
  WHERE name ILIKE '%mikro%' AND name ILIKE '%ikt%' 
  LIMIT 1;

  -- Fallback if course not found, maybe null or raise notice
  IF v_course_id IS NULL THEN
     RAISE NOTICE 'Course Mikro Iktisat not found, inserting with NULL course_id';
  END IF;

  -- Construct Timeline with explicit timestamps (assuming +03 offset for user's local time per request context, but standard is usually UTC. 
  -- However, the user gave local times. `timestamptz` with a timezone offset in the string works best.)
  -- If the server is in UTC, `v_date + time '...'` might be interpreted as UTC.
  -- Let's be safe and specify offset.
  
  v_timeline := jsonb_build_array(
    -- 1. Work: 11:45 – 12:35
    jsonb_build_object(
      'type', 'work',
      'start', (extract(epoch from '2026-01-19 11:45:00+03'::timestamptz) * 1000)::bigint,
      'end', (extract(epoch from '2026-01-19 12:35:00+03'::timestamptz) * 1000)::bigint
    ),
    -- 1. Break: 12:35 – 12:50
    jsonb_build_object(
      'type', 'break',
      'start', (extract(epoch from '2026-01-19 12:35:00+03'::timestamptz) * 1000)::bigint,
      'end', (extract(epoch from '2026-01-19 12:50:00+03'::timestamptz) * 1000)::bigint
    ),
    -- 2. Work: 12:50 – 13:40
    jsonb_build_object(
      'type', 'work',
      'start', (extract(epoch from '2026-01-19 12:50:00+03'::timestamptz) * 1000)::bigint,
      'end', (extract(epoch from '2026-01-19 13:40:00+03'::timestamptz) * 1000)::bigint
    ),
    -- 2. Break: 13:40 – 13:48
    jsonb_build_object(
      'type', 'break',
      'start', (extract(epoch from '2026-01-19 13:40:00+03'::timestamptz) * 1000)::bigint,
      'end', (extract(epoch from '2026-01-19 13:48:00+03'::timestamptz) * 1000)::bigint
    ),
    -- 3. Work: 13:48 – 14:48
    jsonb_build_object(
      'type', 'work',
      'start', (extract(epoch from '2026-01-19 13:48:00+03'::timestamptz) * 1000)::bigint,
      'end', (extract(epoch from '2026-01-19 14:48:00+03'::timestamptz) * 1000)::bigint
    ),
    -- 3. Break: 14:48 – 14:58
    jsonb_build_object(
      'type', 'break',
      'start', (extract(epoch from '2026-01-19 14:48:00+03'::timestamptz) * 1000)::bigint,
      'end', (extract(epoch from '2026-01-19 14:58:00+03'::timestamptz) * 1000)::bigint
    ),
    -- 4. Work: 14:58 – 15:55
    jsonb_build_object(
      'type', 'work',
      'start', (extract(epoch from '2026-01-19 14:58:00+03'::timestamptz) * 1000)::bigint,
      'end', (extract(epoch from '2026-01-19 15:55:00+03'::timestamptz) * 1000)::bigint
    ),
    -- 4. Break: 15:55 – 16:03
    jsonb_build_object(
      'type', 'break',
      'start', (extract(epoch from '2026-01-19 15:55:00+03'::timestamptz) * 1000)::bigint,
      'end', (extract(epoch from '2026-01-19 16:03:00+03'::timestamptz) * 1000)::bigint
    ),
    -- 5. Work: 16:03 – 16:35
    jsonb_build_object(
      'type', 'work',
      'start', (extract(epoch from '2026-01-19 16:03:00+03'::timestamptz) * 1000)::bigint,
      'end', (extract(epoch from '2026-01-19 16:35:00+03'::timestamptz) * 1000)::bigint
    )
  );

  -- Insert the session
  INSERT INTO pomodoro_sessions (
    id,
    user_id,
    course_id,
    course_name,
    started_at,
    ended_at,
    total_work_time,
    total_break_time,
    total_pause_time,
    timeline,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_course_id,
    v_course_name,
    '2026-01-19 11:45:00+03', -- Start of first session
    '2026-01-19 16:35:00+03', -- End of last session
    v_total_work,
    v_total_break,
    v_total_pause,
    v_timeline,
    now()
  );

END $$;
