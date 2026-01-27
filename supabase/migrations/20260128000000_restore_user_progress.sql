-- Restore user's pomodoro sessions and video progress
-- User ID: f63e5a09-7401-481d-9cfb-c1bb1940a999

DO $$
DECLARE
    mikro_course_id uuid;
    muhasebe_course_id uuid;
    user_id_val uuid := 'f63e5a09-7401-481d-9cfb-c1bb1940a999';
    video_rec RECORD;
    video_count int := 0;
BEGIN
    -- Get new course IDs
    SELECT id INTO mikro_course_id FROM public.courses WHERE course_slug = 'mikro-iktisat' LIMIT 1;
    SELECT id INTO muhasebe_course_id FROM public.courses WHERE course_slug = 'muhasebe' LIMIT 1;

    RAISE NOTICE 'Mikro İktisat ID: %', mikro_course_id;
    RAISE NOTICE 'Genel Muhasebe ID: %', muhasebe_course_id;

    -- =====================
    -- 1. FIX POMODORO SESSIONS (update null course_id based on course_name)
    -- =====================
    
    -- Fix Mikro İktisat sessions
    UPDATE public.pomodoro_sessions 
    SET course_id = mikro_course_id
    WHERE user_id = user_id_val 
      AND course_name = 'Mikro İktisat' 
      AND course_id IS NULL;
    
    -- Fix Genel Muhasebe sessions
    UPDATE public.pomodoro_sessions 
    SET course_id = muhasebe_course_id
    WHERE user_id = user_id_val 
      AND course_name = 'Genel Muhasebe' 
      AND course_id IS NULL;

    -- =====================
    -- 2. MARK FIRST 17 MIKRO İKTİSAT VIDEOS AS COMPLETED
    -- =====================
    FOR video_rec IN 
        SELECT v.id, v.video_number 
        FROM public.videos v
        WHERE v.course_id = mikro_course_id
        ORDER BY v.video_number ASC
        LIMIT 17
    LOOP
        video_count := video_count + 1;
        
        INSERT INTO public.video_progress (user_id, video_id, completed, completed_at)
        VALUES (
            user_id_val,
            video_rec.id,
            true,
            -- Distribute completions: Jan 19, 21, 26
            CASE 
                WHEN video_rec.video_number <= 6 THEN '2026-01-19 16:30:00+00'::timestamptz
                WHEN video_rec.video_number <= 10 THEN '2026-01-21 13:20:00+00'::timestamptz
                ELSE '2026-01-26 13:19:00+00'::timestamptz
            END
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Marked % Mikro İktisat videos as completed', video_count;
    
    -- =====================
    -- 3. MARK FIRST 7 GENEL MUHASEBE VIDEOS AS COMPLETED
    -- =====================
    video_count := 0;
    
    FOR video_rec IN 
        SELECT v.id, v.video_number 
        FROM public.videos v
        WHERE v.course_id = muhasebe_course_id
        ORDER BY v.video_number ASC
        LIMIT 7
    LOOP
        video_count := video_count + 1;
        
        INSERT INTO public.video_progress (user_id, video_id, completed, completed_at)
        VALUES (
            user_id_val,
            video_rec.id,
            true,
            '2026-01-24 12:14:00+00'::timestamptz -- All on Jan 24
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Marked % Genel Muhasebe videos as completed', video_count;

END $$;
