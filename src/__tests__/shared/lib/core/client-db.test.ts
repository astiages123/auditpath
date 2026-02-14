import { getCategories, getAllCourses } from '@/shared/lib/core/client-db';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockCategories = [
  { id: 1, name: 'Category 1', sort_order: 1, courses: [] },
  { id: 2, name: 'Category 2', sort_order: 2, courses: [] },
];

const mockCourses = [
  { id: 1, name: 'Course 1', sort_order: 1 },
  { id: 2, name: 'Course 2', sort_order: 2 },
];

const mockOrderFn = vi.fn();

vi.mock('@/shared/lib/core/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: mockOrderFn,
      })),
    })),
  },
}));

vi.mock('@/shared/lib/core/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('client-db', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrderFn.mockReset();
  });

  describe('getCategories', () => {
    it('should return categories on successful fetch', async () => {
      mockOrderFn.mockResolvedValue({ data: mockCategories, error: null });

      const result = await getCategories();

      expect(result).toEqual(mockCategories);
    });

    it('should return empty array on error', async () => {
      mockOrderFn.mockResolvedValue({
        data: null,
        error: { message: 'Network Error' },
      });

      const result = await getCategories();

      expect(result).toEqual([]);
    });

    it('should return empty array on AbortError without logging error', async () => {
      mockOrderFn.mockResolvedValue({
        data: null,
        error: { message: 'AbortError', code: 'ABORT_ERROR' },
      });

      const { logger } = await import('@/shared/lib/core/utils/logger');

      const result = await getCategories();

      expect(result).toEqual([]);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return empty array when data is null', async () => {
      mockOrderFn.mockResolvedValue({ data: null, error: null });

      const result = await getCategories();

      expect(result).toEqual([]);
    });
  });

  describe('getAllCourses', () => {
    it('should return courses on successful fetch', async () => {
      mockOrderFn.mockResolvedValue({ data: mockCourses, error: null });

      const result = await getAllCourses();

      expect(result).toEqual(mockCourses);
    });

    it('should return empty array on error and log error', async () => {
      mockOrderFn.mockResolvedValue({
        data: null,
        error: { message: 'DB Error' },
      });

      const { logger } = await import('@/shared/lib/core/utils/logger');

      const result = await getAllCourses();

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith('Error fetching all courses:', {
        message: 'DB Error',
      });
    });

    it('should return empty array when data is null', async () => {
      mockOrderFn.mockResolvedValue({ data: null, error: null });

      const result = await getAllCourses();

      expect(result).toEqual([]);
    });
  });
});
