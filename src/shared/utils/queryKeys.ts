/**
 * Centralized query keys for React Query.
 * Use these keys to ensure consistency and easier cache management across the app.
 */
export const queryKeys = {
  categories: {
    all: ['categories'] as const,
    list: () => [...queryKeys.categories.all, 'list'] as const,
  },
  courses: {
    all: ['courses'] as const,
    list: () => [...queryKeys.courses.all, 'list'] as const,
    detail: (slug: string) =>
      [...queryKeys.courses.all, 'detail', slug] as const,
  },
  progress: {
    all: ['progress'] as const,
    user: (userId: string) =>
      [...queryKeys.progress.all, 'user', userId] as const,
    stats: (userId: string) =>
      [...queryKeys.progress.user(userId), 'stats'] as const,
  },
  costs: {
    all: ['costs'] as const,
    costs: (page: number) => [...queryKeys.costs.all, 'costs', page] as const,
  },
};
