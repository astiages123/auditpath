-- 1. "Muhasebe" (duplicates) vs "Genel Muhasebe" (canonical)
-- Delete 'Muhasebe' entries (total_videos = 0 or specific names)
DELETE FROM public.courses 
WHERE name = 'Muhasebe' 
   OR (name = 'Genel Muhasebe' AND total_videos = 0);

-- 2. "Medeni Hukuk" (duplicates)
-- Keep entries with content, remove placeholders
DELETE FROM public.courses 
WHERE name = 'Medeni Hukuk ' -- Note the trailing space in one of the duplicates
   OR (name = 'Medeni Hukuk' AND total_videos = 0)
   OR (course_slug = 'medeni-hukuk' AND total_videos = 0);

-- 3. "Mikro İktisat" (duplicates)
-- Remove empty placeholders, keep the populated one (we'll fix its category linkage separately if needed, but duplicates must go)
DELETE FROM public.courses
WHERE course_slug = 'mikro-iktisat' AND total_videos = 0;

-- 4. General Cleanup for any other 0-video duplicates created recently
-- Be careful not to delete legitimate new empty courses, but here we target specific recent creates if needed.
-- For now, the targeted deletes above cover the user's reported list.

-- 5. Fix "Mikro İktisat" Category Linkage (if missing)
-- Link valid 'Mikro İktisat' to 'EKONOMİ' category (assuming we can find it by name)
-- First find the category ID for 'EKONOMİ' (or closest match)
DO $$
DECLARE
    cat_id uuid;
BEGIN
    SELECT id INTO cat_id FROM public.categories WHERE name LIKE '%EKONOMİ%' LIMIT 1;
    
    IF cat_id IS NOT NULL THEN
        UPDATE public.courses
        SET category_id = cat_id
        WHERE name = 'Mikro İktisat' AND total_videos > 0 AND category_id IS NULL;
    END IF;
END $$;
