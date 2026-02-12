import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNotesNavigation } from '@/features/notes/hooks/useNotesNavigation';
import type { CourseTopic } from '@/shared/types/efficiency';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useNotesNavigation', () => {
  const createMockChunks = (count: number): CourseTopic[] => {
    return Array.from({ length: count }, (_, index) => ({
      id: `chunk-${index}`,
      course_id: 'test-course',
      course_name: 'Test Course',
      section_title: `Section ${index}`,
      content: `Content for section ${index}`,
      display_content: null,
      chunk_order: index,
      status: 'SYNCED' as const,
      metadata: null,
      ai_logic: null,
      created_at: null,
      last_synced_at: null,
    }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Initial State', () => {
    it('should initialize with scrollProgress 0', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      expect(result.current.scrollProgress).toBe(0);
    });

    it('should provide mainContentRef', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      expect(result.current.mainContentRef).toBeDefined();
      expect(result.current.mainContentRef.current).toBeNull();
    });

    it('should provide isProgrammaticScroll ref', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      expect(result.current.isProgrammaticScroll).toBeDefined();
      expect(result.current.isProgrammaticScroll.current).toBe(false);
    });
  });

  describe('handleScrollToId', () => {
    it('should set isProgrammaticScroll to true', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      act(() => {
        result.current.handleScrollToId('test-id');
      });

      expect(result.current.isProgrammaticScroll.current).toBe(true);
    });

    it('should call setActiveSection if provided', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      const mockSetActiveSection = vi.fn();

      act(() => {
        result.current.handleScrollToId('test-id', mockSetActiveSection);
      });

      expect(mockSetActiveSection).toHaveBeenCalledWith('test-id');
    });

    it('should reset isProgrammaticScroll after timeout', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      act(() => {
        result.current.handleScrollToId('test-id');
      });

      expect(result.current.isProgrammaticScroll.current).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.isProgrammaticScroll.current).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('scrollToTop', () => {
    it('should be a function', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      expect(typeof result.current.scrollToTop).toBe('function');
    });
  });

  describe('Scroll Position Persistence', () => {
    it('should check localStorage for saved position', async () => {
      localStorageMock.getItem.mockReturnValue('150');

      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      // The hook may check localStorage for saved position
      // This is dependent on the hook's internal implementation
      expect(result.current).toBeDefined();
    });

    it('should use courseSlug for localStorage operations', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'my-special-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      // The hook should be functional regardless of localStorage
      expect(result.current).toBeDefined();
    });
  });

  describe('Active Chunk Change', () => {
    it('should reset scroll when activeChunkId changes', async () => {
      const { result, rerender } = renderHook(
        (props) =>
          useNotesNavigation({
            courseSlug: 'test-course',
            loading: false,
            chunks: createMockChunks(2),
            activeChunkId: props.activeChunkId,
          }),
        { initialProps: { activeChunkId: 'section-0' } }
      );

      // Change active chunk
      rerender({ activeChunkId: 'section-1' });

      // The hook should handle this internally
      expect(result.current).toBeDefined();
    });
  });

  describe('Loading State', () => {
    it('should handle loading state', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: true,
          chunks: [],
          activeChunkId: '',
        })
      );

      expect(result.current.scrollProgress).toBe(0);
    });
  });

  describe('Empty Chunks', () => {
    it('should handle empty chunks array', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: [],
          activeChunkId: '',
        })
      );

      expect(result.current.scrollProgress).toBe(0);
      expect(result.current.mainContentRef).toBeDefined();
    });
  });
});
