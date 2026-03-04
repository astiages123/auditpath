-- 1. Create enum type for item_type
DO $$ BEGIN
    CREATE TYPE item_type_enum AS ENUM ('video', 'reading');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create enum type for course_type
DO $$ BEGIN
    CREATE TYPE course_type_enum AS ENUM ('video', 'reading');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Update videos table
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS item_type item_type_enum;

-- Update item_type based on course type
UPDATE public.videos v
SET item_type = c.type::text::item_type_enum
FROM public.courses c
WHERE v.course_id = c.id;

-- Default to 'video' for any remaining nulls (safety)
UPDATE public.videos SET item_type = 'video' WHERE item_type IS NULL;

-- Make item_type NOT NULL
ALTER TABLE public.videos ALTER COLUMN item_type SET NOT NULL;

-- 4. Update video_progress table
ALTER TABLE public.video_progress ADD COLUMN IF NOT EXISTS item_type item_type_enum;

-- Update item_type based on video type
UPDATE public.video_progress vp
SET item_type = v.item_type
FROM public.videos v
WHERE vp.video_id = v.id;

-- 5. Refactor courses table type column
-- First, update total_pages to NULL for video courses where it was 0
UPDATE public.courses 
SET total_pages = NULL 
WHERE type = 'video' AND total_pages = 0;

-- Convert type column to enum
ALTER TABLE public.courses 
ALTER COLUMN type TYPE course_type_enum 
USING type::course_type_enum;

-- Make type NOT NULL
ALTER TABLE public.courses ALTER COLUMN type SET NOT NULL;

-- 6. Add CHECK constraints to courses
-- Reading courses: total_videos should be null or represent sections (keeping as is but adding constraint logic)
-- Video courses: total_pages should be null
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS check_course_type_fields;
ALTER TABLE public.courses ADD CONSTRAINT check_course_type_fields 
CHECK (
    (type = 'video' AND total_pages IS NULL) OR 
    (type = 'reading' AND total_videos IS NOT NULL) -- In reading courses, total_videos stores section count
);

-- 7. Add comments for clarity
COMMENT ON COLUMN public.videos.item_type IS 'Type of the item: video or reading section';
COMMENT ON COLUMN public.courses.type IS 'Type of the course: video or reading based';
