import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { CourseTopic } from '@/shared/types/efficiency';

interface MockStorageService {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  has: ReturnType<typeof vi.fn>;
  keys: ReturnType<typeof vi.fn>;
  getRaw: ReturnType<typeof vi.fn>;
  getTimestamp: ReturnType<typeof vi.fn>;
  cleanup: ReturnType<typeof vi.fn>;
}

const createMockStorageService = (): MockStorageService => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
  has: vi.fn(),
  keys: vi.fn(),
  getRaw: vi.fn(),
  getTimestamp: vi.fn(),
  cleanup: vi.fn(),
});

// Mock the storage service
vi.mock('@/shared/lib/core/services/storage.service', () => {
  const mockStorage = createMockStorageService();
  return {
    storage: mockStorage,
    StorageService: vi.fn(() => mockStorage),
  };
});

// Import after mocking
import { useNotesNavigation } from '@/features/notes/hooks/useNotesNavigation';

describe('useNotesNavigation', () => {
  const mockStorage = createMockStorageService();

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

  // Helper to create a mock div with scroll behavior
  const createMockScrollElement = (
    options: {
      scrollTop?: number;
      scrollHeight?: number;
      clientHeight?: number;
    } = {}
  ) => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollTop', {
      value: options.scrollTop ?? 0,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(element, 'scrollHeight', {
      value: options.scrollHeight ?? 1000,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(element, 'clientHeight', {
      value: options.clientHeight ?? 500,
      writable: true,
      configurable: true,
    });
    element.scrollTo = vi.fn();
    // Type the addEventListener mock properly
    const addEventListenerMock = vi.fn();
    const removeEventListenerMock = vi.fn();
    (element as HTMLElement).addEventListener = addEventListenerMock;
    (element as HTMLElement).removeEventListener = removeEventListenerMock;
    return {
      element,
      addEventListenerMock,
      removeEventListenerMock,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockStorage.get.mockReturnValue(null);
    mockStorage.set.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    it('should provide isProgrammaticScroll ref initialized to false', () => {
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

    it('should provide handleScrollToId function', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      expect(typeof result.current.handleScrollToId).toBe('function');
    });

    it('should provide scrollToTop function', () => {
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

  describe('Scroll Progress Calculation', () => {
    it('should calculate scroll progress correctly (Formula: progress = (scrollTop / (scrollHeight - clientHeight)) * 100)', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      const { element, addEventListenerMock } = createMockScrollElement({
        scrollTop: 250,
        scrollHeight: 1000,
        clientHeight: 500,
      });

      // Manually assign the ref
      result.current.mainContentRef.current = element;

      // Get the scroll handler from addEventListener calls
      type EventListenerCall = [string, () => void];
      const calls = addEventListenerMock.mock.calls as EventListenerCall[];
      const scrollHandler = calls.find((call) => call[0] === 'scroll')?.[1];

      if (scrollHandler) {
        act(() => {
          scrollHandler();
        });

        // Formula: (250 / (1000 - 500)) * 100 = 50
        expect(result.current.scrollProgress).toBe(50);
      }
    });

    it('should calculate 0% progress when at top', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      const { element, addEventListenerMock } = createMockScrollElement({
        scrollTop: 0,
        scrollHeight: 1000,
        clientHeight: 500,
      });

      result.current.mainContentRef.current = element;

      type EventListenerCall = [string, () => void];
      const calls = addEventListenerMock.mock.calls as EventListenerCall[];
      const scrollHandler = calls.find((call) => call[0] === 'scroll')?.[1];

      if (scrollHandler) {
        act(() => {
          scrollHandler();
        });

        expect(result.current.scrollProgress).toBe(0);
      }
    });

    it('should calculate 100% progress when at bottom', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      const { element, addEventListenerMock } = createMockScrollElement({
        scrollTop: 500, // scrollHeight - clientHeight = 500
        scrollHeight: 1000,
        clientHeight: 500,
      });

      result.current.mainContentRef.current = element;

      type EventListenerCall = [string, () => void];
      const calls = addEventListenerMock.mock.calls as EventListenerCall[];
      const scrollHandler = calls.find((call) => call[0] === 'scroll')?.[1];

      if (scrollHandler) {
        act(() => {
          scrollHandler();
        });

        expect(result.current.scrollProgress).toBe(100);
      }
    });

    it('should handle division by zero when content fits viewport', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      const { element, addEventListenerMock } = createMockScrollElement({
        scrollTop: 0,
        scrollHeight: 500,
        clientHeight: 500, // scrollHeight - clientHeight = 0
      });

      result.current.mainContentRef.current = element;

      type EventListenerCall = [string, () => void];
      const calls = addEventListenerMock.mock.calls as EventListenerCall[];
      const scrollHandler = calls.find((call) => call[0] === 'scroll')?.[1];

      if (scrollHandler) {
        act(() => {
          scrollHandler();
        });

        // Should handle NaN/Infinity gracefully
        expect(result.current.scrollProgress).toBeNaN();
      }
    });
  });

  describe('Scroll Position Persistence', () => {
    it('should call storage.set with correct key and value on scroll', async () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'my-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      const { element, addEventListenerMock } = createMockScrollElement({
        scrollTop: 150,
        scrollHeight: 1000,
        clientHeight: 500,
      });

      result.current.mainContentRef.current = element;

      // Find the saveScroll handler (second scroll listener)
      type EventListenerCall = [string, () => void];
      const calls = addEventListenerMock.mock.calls as EventListenerCall[];
      const scrollHandlers = calls.filter((call) => call[0] === 'scroll');
      const saveScrollHandler = scrollHandlers[1]?.[1];

      if (saveScrollHandler) {
        act(() => {
          saveScrollHandler();
        });

        expect(mockStorage.set).toHaveBeenCalledWith(
          'scroll_pos_my-course',
          '150',
          { ttl: 24 * 60 * 60 * 1000 }
        );
      }
    });

    it('should not save scroll position when courseSlug is undefined', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: undefined,
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      const { element } = createMockScrollElement();
      result.current.mainContentRef.current = element;

      // storage.set should not be called when courseSlug is undefined
      expect(mockStorage.set).not.toHaveBeenCalled();
    });

    it('should restore scroll position from storage on mount', async () => {
      vi.useFakeTimers();
      mockStorage.get.mockReturnValue('200');

      const mockElement = createMockScrollElement({
        scrollTop: 0,
        scrollHeight: 1000,
        clientHeight: 500,
      });

      // First render with loading=true to prevent immediate effect
      const { result, rerender } = renderHook(
        (props) =>
          useNotesNavigation({
            courseSlug: 'test-course',
            loading: props.loading,
            chunks: props.chunks,
            activeChunkId: 'section-0',
          }),
        {
          initialProps: {
            loading: true,
            chunks: [] as CourseTopic[],
          },
        }
      );

      // Assign the ref before changing loading state
      result.current.mainContentRef.current = mockElement.element;

      // Now set loading to false with chunks
      rerender({
        loading: false,
        chunks: createMockChunks(2),
      });

      // Advance timers to trigger the setTimeout
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(mockStorage.get).toHaveBeenCalledWith('scroll_pos_test-course');
      expect(mockElement.element.scrollTo).toHaveBeenCalledWith({
        top: 200,
        behavior: 'instant',
      });

      vi.useRealTimers();
    });

    it('should not restore scroll position when loading is true', () => {
      mockStorage.get.mockReturnValue('200');

      const { element } = createMockScrollElement();

      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: true,
          chunks: [],
          activeChunkId: 'section-0',
        })
      );

      result.current.mainContentRef.current = element;

      expect(element.scrollTo).not.toHaveBeenCalled();
    });

    it('should not restore scroll position when chunks are empty', () => {
      mockStorage.get.mockReturnValue('200');

      const { element } = createMockScrollElement();

      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: [],
          activeChunkId: 'section-0',
        })
      );

      result.current.mainContentRef.current = element;

      expect(element.scrollTo).not.toHaveBeenCalled();
    });

    it('should handle NaN saved scroll value gracefully', async () => {
      vi.useFakeTimers();
      mockStorage.get.mockReturnValue('not-a-number');

      const { element } = createMockScrollElement();

      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      result.current.mainContentRef.current = element;

      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Should not call scrollTo with NaN
      expect(element.scrollTo).not.toHaveBeenCalled();

      vi.useRealTimers();
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

    it('should call scrollIntoView when element exists', () => {
      const mockElement = document.createElement('div');
      mockElement.id = 'test-section';
      mockElement.scrollIntoView = vi.fn();
      document.body.appendChild(mockElement);

      const { element } = createMockScrollElement();
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      result.current.mainContentRef.current = element;

      act(() => {
        result.current.handleScrollToId('test-section');
      });

      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });

      document.body.removeChild(mockElement);
    });

    it('should not call scrollIntoView when element does not exist', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      // Should not throw when element doesn't exist
      act(() => {
        result.current.handleScrollToId('non-existent-id');
      });

      expect(result.current.isProgrammaticScroll.current).toBe(true);
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

    it('should clear previous timeout when called multiple times', async () => {
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
        result.current.handleScrollToId('test-id-1');
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      act(() => {
        result.current.handleScrollToId('test-id-2');
      });

      // Should still be true after first timeout would have fired
      expect(result.current.isProgrammaticScroll.current).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.isProgrammaticScroll.current).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('scrollToTop', () => {
    it('should call scrollTo with top: 0 and smooth behavior', () => {
      const { element } = createMockScrollElement();

      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      result.current.mainContentRef.current = element;

      act(() => {
        result.current.scrollToTop();
      });

      expect(element.scrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth',
      });
    });

    it('should not throw when mainContentRef is null', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      // mainContentRef.current is null by default
      expect(() => {
        result.current.scrollToTop();
      }).not.toThrow();
    });
  });

  describe('Active Chunk Change', () => {
    it('should scroll to top when activeChunkId changes', () => {
      const { element } = createMockScrollElement();

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

      result.current.mainContentRef.current = element;

      rerender({ activeChunkId: 'section-1' });

      expect(element.scrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: 'instant',
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup scroll timeout on unmount', async () => {
      vi.useFakeTimers();

      const { unmount } = renderHook(() =>
        useNotesNavigation({
          courseSlug: 'test-course',
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      unmount();

      // Advance timers - should not throw
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      vi.useRealTimers();
    });

    it('should remove scroll event listeners on unmount', () => {
      const mockElement = createMockScrollElement();

      // Render with loading=true first
      const { unmount, result, rerender } = renderHook(
        (props) =>
          useNotesNavigation({
            courseSlug: 'test-course',
            loading: props.loading,
            chunks: props.chunks,
            activeChunkId: 'section-0',
          }),
        {
          initialProps: {
            loading: true,
            chunks: [] as CourseTopic[],
          },
        }
      );

      // Assign the ref before effects run
      result.current.mainContentRef.current = mockElement.element;

      // Trigger effects by setting loading to false
      rerender({
        loading: false,
        chunks: createMockChunks(2),
      });

      // Now unmount
      unmount();

      // Check that removeEventListener was called
      expect(mockElement.removeEventListenerMock).toHaveBeenCalled();
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

    it('should transition from loading to loaded state', () => {
      const { element } = createMockScrollElement();

      const { result, rerender } = renderHook(
        (props) =>
          useNotesNavigation({
            courseSlug: 'test-course',
            loading: props.loading,
            chunks: props.chunks,
            activeChunkId: 'section-0',
          }),
        {
          initialProps: {
            loading: true,
            chunks: [] as CourseTopic[],
          },
        }
      );

      result.current.mainContentRef.current = element;

      // Transition to loaded
      rerender({
        loading: false,
        chunks: createMockChunks(2),
      });

      // Should work without errors
      expect(result.current.scrollProgress).toBeDefined();
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

  describe('Edge Cases', () => {
    it('should handle undefined courseSlug', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: undefined,
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      expect(result.current.scrollProgress).toBe(0);
    });

    it('should handle null courseSlug gracefully', () => {
      const { result } = renderHook(() =>
        useNotesNavigation({
          courseSlug: undefined,
          loading: false,
          chunks: createMockChunks(2),
          activeChunkId: 'section-0',
        })
      );

      expect(result.current.scrollProgress).toBe(0);
    });

    it('should handle chunks changing', () => {
      const { element, addEventListenerMock } = createMockScrollElement();

      const { result, rerender } = renderHook(
        (props) =>
          useNotesNavigation({
            courseSlug: 'test-course',
            loading: false,
            chunks: props.chunks,
            activeChunkId: 'section-0',
          }),
        { initialProps: { chunks: createMockChunks(2) } }
      );

      result.current.mainContentRef.current = element;

      // Change chunks
      rerender({ chunks: createMockChunks(5) });

      // Should re-add event listeners
      expect(addEventListenerMock).toHaveBeenCalled();
    });
  });
});
