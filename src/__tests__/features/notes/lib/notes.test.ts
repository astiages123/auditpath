import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { getNote } from '@/features/notes/lib/notes';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('notes.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getNote', () => {
    it('should return note content on successful fetch', async () => {
      const mockContent = '# Test Note\n\nThis is test content.';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockContent),
      });

      const result = await getNote('test-course');

      expect(result).toEqual({
        courseId: 'test-course',
        content: mockContent,
        updatedAt: expect.any(Date),
      });
    });

    it('should try primary path first', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('content'),
      });

      await getNote('my-course');

      expect(mockFetch).toHaveBeenCalledWith('/notes/my-course/my-course.md');
    });

    it('should try fallback path if primary fails', async () => {
      // Primary path fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve(''),
      });

      // Fallback path succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('fallback content'),
      });

      const result = await getNote('test-course');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        '/notes/test-course/test-course.md'
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        '/notes/test-course/note.md'
      );
      expect(result?.content).toBe('fallback content');
    });

    it('should return null if all paths fail', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: () => Promise.resolve(''),
      });

      const result = await getNote('nonexistent');

      expect(result).toBeNull();
    });

    it('should reject HTML responses (DOCTYPE)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve('<!DOCTYPE html><html><body>Not found</body></html>'),
      });

      const result = await getNote('test-course');

      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await getNote('test-course');

      expect(result).toBeNull();
      // The error is caught internally in the try-catch blocks
      // Console.error may or may not be called depending on implementation

      consoleSpy.mockRestore();
    });

    it('should handle fetch exceptions in try-catch', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // First call throws
      mockFetch.mockImplementationOnce(() => {
        throw new Error('Fetch failed');
      });

      // Second call also throws
      mockFetch.mockImplementationOnce(() => {
        throw new Error('Fetch failed');
      });

      const result = await getNote('test-course');

      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });

    it('should return null for empty content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      });

      // Empty content should still return, but with empty string
      const result = await getNote('test-course');

      // The function checks for content && !DOCTYPE, so empty string is falsy
      // Let's check the actual behavior
      expect(result).toBeNull();
    });

    it('should set correct courseId in return value', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('content'),
      });

      const result = await getNote('special-course-123');

      expect(result?.courseId).toBe('special-course-123');
    });

    it('should set updatedAt to current date', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('content'),
      });

      const beforeDate = new Date();
      const result = await getNote('test-course');
      const afterDate = new Date();

      expect(result?.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeDate.getTime()
      );
      expect(result?.updatedAt.getTime()).toBeLessThanOrEqual(
        afterDate.getTime()
      );
    });
  });
});
