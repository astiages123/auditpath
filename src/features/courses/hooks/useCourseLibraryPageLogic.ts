import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Course } from '@/features/courses/types/courseTypes';
import { useCourseLibraryData } from '@/features/courses/hooks/useCourseLibraryData';
import {
  CATEGORY_THEMES,
  COURSE_THEME_CONFIG,
} from '@/features/courses/utils/coursesConfig';
import { normalizeCategorySlug } from '@/features/courses/utils/categoryHelpers';
import { ROUTES } from '@/utils/routes';

export function useCourseLibraryPageLogic() {
  const { categories, dashboardStats, loading } = useCourseLibraryData();
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const navigate = useNavigate();

  const activeCategory = categories[activeCategoryIndex];
  const activeNormalizedSlug = activeCategory
    ? normalizeCategorySlug(activeCategory.name)
    : '';

  const activeTheme = activeCategory
    ? CATEGORY_THEMES[activeNormalizedSlug] ||
      CATEGORY_THEMES[activeCategory.slug] ||
      CATEGORY_THEMES[activeCategory.name.toUpperCase()]
    : undefined;

  const activeThemeConfig = activeTheme
    ? COURSE_THEME_CONFIG[activeTheme.theme]
    : COURSE_THEME_CONFIG.primary;

  const sortedCourses = useMemo(
    () =>
      [...(activeCategory?.courses ?? [])].sort(
        (a, b) =>
          (a.sort_order || 0) - (b.sort_order || 0) ||
          a.name.localeCompare(b.name)
      ),
    [activeCategory]
  );

  const navigateToNotes = (course: Course) => {
    navigate(`${ROUTES.NOTES}/${course.course_slug}`);
  };

  const navigateToQuiz = (course: Course) => {
    navigate(`${ROUTES.QUIZ}/${course.course_slug}`);
  };

  return {
    categories,
    dashboardStats,
    loading,
    activeCategoryIndex,
    setActiveCategoryIndex,
    activeCategory,
    activeTheme,
    activeThemeConfig,
    sortedCourses,
    navigateToNotes,
    navigateToQuiz,
  };
}
