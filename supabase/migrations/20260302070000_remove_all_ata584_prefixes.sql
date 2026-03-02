-- Migration: Remove all numbering prefixes for ATA 584
-- The frontend will handle displaying the week as a badge

-- 1. Clean names in courses table: Remove any "X) " or "Hafta X: " prefix
UPDATE public.courses
SET name = trim(regexp_replace(name, '^([0-9]+\s*[)]\s*|Hafta\s+[0-9]+\s*[:]\s*)', '', 'i'))
WHERE category_id = (SELECT id FROM public.categories WHERE slug = 'ATA_584');

-- 2. Clean names in note_chunks table
UPDATE public.note_chunks
SET section_title = trim(regexp_replace(section_title, '^([0-9]+\s*[)]\s*|Hafta\s+[0-9]+\s*[:]\s*)', '', 'i'))
FROM public.courses
WHERE public.note_chunks.course_id = public.courses.id
  AND public.courses.category_id = (SELECT id FROM public.categories WHERE slug = 'ATA_584');
