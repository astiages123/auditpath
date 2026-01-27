-- Restore "Mikro İktisat" and "Genel Muhasebe"
-- Uses explicit IF logic to avoid ON CONFLICT errors if course_slug isn't unique indexed yet.

DO $$
DECLARE
    cat_ekonomi_id uuid;
    cat_muhasebe_id uuid;
    existing_id uuid;
BEGIN
    -- Find Category IDs
    SELECT id INTO cat_ekonomi_id FROM public.categories WHERE name ILIKE '%EKONOMİ%' LIMIT 1;
    SELECT id INTO cat_muhasebe_id FROM public.categories WHERE name ILIKE '%MUHASEBE VE MALİYE%' LIMIT 1;

    -- 1. Restore/Upsert "Mikro İktisat"
    SELECT id INTO existing_id FROM public.courses WHERE course_slug = 'mikro-iktisat' LIMIT 1;
    
    IF existing_id IS NOT NULL THEN
        UPDATE public.courses SET
            name = 'Mikro İktisat',
            total_videos = 111,
            total_hours = 60.67,
            playlist_url = 'https://www.youtube.com/playlist?list=PLPhEmM6X--Wefl2MTmJ67Uv851yYQTfB4',
            instructor = 'Bilge Beyaz',
            category_id = cat_ekonomi_id
        WHERE id = existing_id;
    ELSE
        INSERT INTO public.courses (
            course_slug, name, total_videos, total_hours, playlist_url, instructor, category_id, sort_order
        )
        VALUES (
            'mikro-iktisat',
            'Mikro İktisat',
            111,
            60.67,
            'https://www.youtube.com/playlist?list=PLPhEmM6X--Wefl2MTmJ67Uv851yYQTfB4',
            'Bilge Beyaz',
            cat_ekonomi_id,
            0
        );
    END IF;


    -- 2. Restore/Upsert "Genel Muhasebe"
    -- Note: We use 'muhasebe' as slug for Genel Muhasebe per JSON source
    SELECT id INTO existing_id FROM public.courses WHERE course_slug = 'muhasebe' LIMIT 1;

    IF existing_id IS NOT NULL THEN
         UPDATE public.courses SET
            name = 'Genel Muhasebe',
            total_videos = 124,
            total_hours = 42.61,
            playlist_url = 'https://youtube.com/playlist?list=PLPhEmM6X--WfpyELg1RTSCI6zqpe8lTCV&si=YUeLZcBv-GH2wmHG',
            instructor = 'Sinan Öztürk',
            category_id = cat_muhasebe_id
        WHERE id = existing_id;
    ELSE
        INSERT INTO public.courses (
            course_slug, name, total_videos, total_hours, playlist_url, instructor, category_id, sort_order
        )
        VALUES (
            'muhasebe',
            'Genel Muhasebe',
            124,
            42.61,
            'https://youtube.com/playlist?list=PLPhEmM6X--WfpyELg1RTSCI6zqpe8lTCV&si=YUeLZcBv-GH2wmHG',
            'Sinan Öztürk',
            cat_muhasebe_id,
            0
        );
    END IF;

END $$;
