DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.courses
    WHERE course_slug IS NOT NULL
    GROUP BY course_slug
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot add unique constraint to public.courses.course_slug because duplicate values exist.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.categories
    WHERE slug IS NOT NULL
    GROUP BY slug
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot add unique constraint to public.categories.slug because duplicate values exist.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS courses_course_slug_unique_idx
  ON public.courses (course_slug);

CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_unique_idx
  ON public.categories (slug)
  WHERE slug IS NOT NULL;
