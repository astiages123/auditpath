import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getNote } from '@/features/notes/lib/notes';

// Mock the logger module
vi.mock('@/shared/lib/core/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    withPrefix: vi.fn(() => ({
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

// Mock env for consistency across tests
vi.mock('@/config/env', () => ({
  env: { app: { isDev: true } },
}));

// Import the mocked logger after vi.mock
import { logger } from '@/shared/lib/core/utils/logger';
// Use logger to avoid unused import error
logger.debug('Test module loaded');

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
    describe('Successful fetch scenarios', () => {
      it('should return note content on successful fetch from primary path', async () => {
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
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith(
          '/notes/test-course/test-course.md',
          {
            signal: undefined,
          }
        );
      });

      it('should return note content from fallback path when primary fails', async () => {
        // Primary path fails (404)
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: () => Promise.resolve(''),
        });

        // Fallback path succeeds
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('fallback content'),
        });

        const result = await getNote('test-course');

        expect(result).toEqual({
          courseId: 'test-course',
          content: 'fallback content',
          updatedAt: expect.any(Date),
        });
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenNthCalledWith(
          1,
          '/notes/test-course/test-course.md',
          { signal: undefined }
        );
        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          '/notes/test-course/note.md',
          { signal: undefined }
        );
      });

      it('should try fallback path when primary path throws network error', async () => {
        // Primary path throws error
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        // Fallback path succeeds
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('fallback content after error'),
        });

        const result = await getNote('test-course');

        expect(result?.content).toBe('fallback content after error');
        expect(mockFetch).toHaveBeenCalledTimes(2);
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

      it('should pass AbortSignal to fetch when provided', async () => {
        const controller = new AbortController();
        const signal = controller.signal;
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('content'),
        });

        await getNote('test-course', signal);

        expect(mockFetch).toHaveBeenCalledWith(
          '/notes/test-course/test-course.md',
          {
            signal,
          }
        );
      });
    });

    describe('HTML response rejection', () => {
      it('should return null when content starts with <!DOCTYPE html>', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(
              '<!DOCTYPE html><html><body>Not found</body></html>'
            ),
        });

        const result = await getNote('test-course');

        expect(result).toBeNull();
      });

      it('should try fallback path when primary returns HTML', async () => {
        // Primary returns HTML (SPA fallback)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve('<!DOCTYPE html><html><body>Index</body></html>'),
        });

        // Fallback succeeds with real content
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('# Real Content'),
        });

        const result = await getNote('test-course');

        expect(result?.content).toBe('# Real Content');
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should return null when both paths return HTML', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: () =>
            Promise.resolve(
              '<!DOCTYPE html><html><body>Not found</body></html>'
            ),
        });

        const result = await getNote('test-course');

        expect(result).toBeNull();
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should accept content that contains HTML but does not start with DOCTYPE', async () => {
        const contentWithHtml =
          '# Title\n\nSome <strong>bold</strong> text in markdown.';
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(contentWithHtml),
        });

        const result = await getNote('test-course');

        expect(result?.content).toBe(contentWithHtml);
      });
    });

    describe('Error handling', () => {
      it('should return null when all paths fail', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 404,
          text: () => Promise.resolve(''),
        });

        const result = await getNote('nonexistent');

        expect(result).toBeNull();
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should return null when first path returns 404', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 404,
          text: () => Promise.resolve('Not Found'),
        });

        const result = await getNote('test-course');

        expect(result).toBeNull();
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should return null when first path returns 500', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
        });

        const result = await getNote('test-course');

        expect(result).toBeNull();
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should return null when first path returns 403', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 403,
          text: () => Promise.resolve('Forbidden'),
        });

        const result = await getNote('test-course');

        expect(result).toBeNull();
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should try fallback when first path returns HTTP error but second succeeds', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
            text: () => Promise.resolve(''),
          })
          .mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve('# Fallback Note'),
          });

        const result = await getNote('test-course');

        expect(result?.content).toBe('# Fallback Note');
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should return null for empty content', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(''),
        });

        const result = await getNote('test-course');

        expect(result).toBeNull();
      });

      it('should handle network errors gracefully and return null', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const result = await getNote('test-course');

        expect(result).toBeNull();
      });

      it('should handle errors gracefully and return null', async () => {
        // Create an error that will be caught by the inner try-catch
        const mockError = new Error('Critical fetch failure');

        // Make both paths throw - these are caught by inner try-catch which continues
        mockFetch.mockImplementation(() => {
          throw mockError;
        });

        const result = await getNote('test-course');

        // Inner try-catch catches errors and continues, so result should be null
        expect(result).toBeNull();
      });

      it('should continue to next path when fetch throws in inner try-catch', async () => {
        // First call throws
        mockFetch.mockImplementationOnce(() => {
          throw new Error('Fetch failed');
        });

        // Second call succeeds
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('success after error'),
        });

        const result = await getNote('test-course');

        expect(result?.content).toBe('success after error');
      });

      it('should return null when outer catch block is triggered', async () => {
        // Simulate an error that bypasses inner catch (though unlikely in practice)
        mockFetch.mockRejectedValue(new Error('Critical outer error'));

        const result = await getNote('test-course');

        expect(result).toBeNull();
      });

      it('should log error when outer catch block is triggered by slug string conversion', async () => {
        // eslint-disable-next-line no-restricted-syntax
        const badSlug = {
          toString: () => {
            throw new Error('Slug Error');
          },
        } as unknown as string;

        const result = await getNote(badSlug);

        expect(logger.error).toHaveBeenCalledWith(
          'getNote error:',
          expect.any(Error)
        );
        expect(result).toBeNull();
      });
    });

    describe('Edge cases', () => {
      it('should handle special characters in slug', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('content'),
        });

        await getNote('course-with-dashes_and_underscores');

        expect(mockFetch).toHaveBeenCalledWith(
          '/notes/course-with-dashes_and_underscores/course-with-dashes_and_underscores.md',
          { signal: undefined }
        );
      });

      it('should handle markdown content with various elements', async () => {
        const complexMarkdown = `# Main Title

## Section 1

Some paragraph with **bold** and *italic* text.

\`\`\`typescript
const code = "example";
\`\`\`

- List item 1
- List item 2

> Blockquote

[Link](https://example.com)
`;

        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(complexMarkdown),
        });

        const result = await getNote('test-course');

        expect(result?.content).toBe(complexMarkdown);
      });

      it('should handle very long content', async () => {
        const longContent = 'x'.repeat(100000);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(longContent),
        });

        const result = await getNote('test-course');

        expect(result?.content).toBe(longContent);
        expect(result?.content.length).toBe(100000);
      });

      it('should handle content with only whitespace', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('   \n\n   \t  '),
        });

        const result = await getNote('test-course');

        // Whitespace-only content is truthy, so it should be returned
        expect(result).not.toBeNull();
        expect(result?.content).toBe('   \n\n   \t  ');
      });
    });
  });
});
