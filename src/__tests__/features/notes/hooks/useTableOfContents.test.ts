import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useTableOfContents } from '@/features/notes/hooks/useTableOfContents';
import type { CourseTopic } from '@/shared/types/efficiency';

// Mock slugify
vi.mock('@/shared/lib/core/utils', () => ({
  slugify: (text: string) => text.toLowerCase().replace(/\s+/g, '-'),
}));

// IntersectionObserver Mocking
let observerCallback: (entries: Partial<IntersectionObserverEntry>[]) => void;
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

class MockIntersectionObserver {
  constructor(
    callback: (entries: Partial<IntersectionObserverEntry>[]) => void
  ) {
    observerCallback = callback;
  }
  observe = mockObserve;
  unobserve = mockUnobserve;
  disconnect = mockDisconnect;
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

describe('useTableOfContents', () => {
  const createMockChunks = (
    chunks: Array<{ section_title?: string; content?: string }>
  ): CourseTopic[] => {
    return chunks.map((chunk, index) => ({
      id: `chunk-${index}`,
      course_id: 'test-course',
      course_name: 'Test Course',
      section_title:
        chunk.section_title !== undefined
          ? chunk.section_title
          : `Section ${index}`,
      content: chunk.content || '',
      display_content: null,
      chunk_order: index,
      status: 'SYNCED' as const,
      metadata: null,
      ai_logic: null,
      created_at: null,
      last_synced_at: null,
    }));
  };

  let mockMainContentRef: { current: HTMLDivElement | null };
  const mockIsProgrammaticScroll = { current: false };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMainContentRef = {
      current: document.createElement('div'),
    };
    mockIsProgrammaticScroll.current = false;
  });

  const injectHeaders = (headers: { id: string; top: number }[]) => {
    if (!mockMainContentRef.current) return;
    mockMainContentRef.current.innerHTML = '';
    headers.forEach(({ id }) => {
      const el = document.createElement('div');
      el.id = id;
      mockMainContentRef.current?.appendChild(el);
    });
  };

  describe('ToC Generation', () => {
    it('should return empty array when chunks are empty', () => {
      const { result } = renderHook(() =>
        useTableOfContents({
          chunks: [],
          loading: false,
          activeChunkId: '',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      expect(result.current.toc).toEqual([]);
    });

    it('should parse H1 headers from content', () => {
      const chunks = createMockChunks([
        {
          section_title: 'Introduction',
          content: '# Main Title\nSome content here.',
        },
      ]);

      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'introduction',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      // Section title (level 1) + H1 header (level 2)
      expect(result.current.toc).toHaveLength(2);
      expect(result.current.toc[0]).toEqual({
        id: 'introduction',
        title: 'Introduction',
        level: 1,
        chunkId: 'introduction',
      });
      expect(result.current.toc[1]).toEqual({
        id: 'main-title',
        title: 'Main Title',
        level: 2,
        chunkId: 'introduction',
      });
    });

    it('should parse H2 headers from content', () => {
      const chunks = createMockChunks([
        {
          section_title: 'Chapter 1',
          content: '## Subsection A\n## Subsection B',
        },
      ]);

      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'chapter-1',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      // Section title + 2 H2 headers
      expect(result.current.toc).toHaveLength(3);
      expect(result.current.toc[1].level).toBe(3); // H2 becomes level 3
      expect(result.current.toc[1].title).toBe('Subsection A');
      expect(result.current.toc[2].title).toBe('Subsection B');
    });

    it('should parse H3 headers from content', () => {
      const chunks = createMockChunks([
        {
          section_title: 'Chapter 1',
          content: '### Detail Section',
        },
      ]);

      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'chapter-1',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      // Section title + H3 header
      expect(result.current.toc).toHaveLength(2);
      expect(result.current.toc[1].level).toBe(4); // H3 becomes level 4
      expect(result.current.toc[1].title).toBe('Detail Section');
    });

    it('should assign correct levels to headers', () => {
      const chunks = createMockChunks([
        {
          section_title: 'Test',
          content: '# H1 Title\n## H2 Title\n### H3 Title',
        },
      ]);

      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'test',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      expect(result.current.toc[0].level).toBe(1); // Section title
      expect(result.current.toc[1].level).toBe(2); // H1
      expect(result.current.toc[2].level).toBe(3); // H2
      expect(result.current.toc[3].level).toBe(4); // H3
    });

    it('should deduplicate items with same ID', () => {
      const chunks = createMockChunks([
        {
          section_title: 'Same Title',
          content: '# Same Title\n## Same Title',
        },
      ]);

      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'same-title',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      // Should dedupe based on ID
      const ids = result.current.toc.map((item) => item.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should handle multiple chunks', () => {
      const chunks = createMockChunks([
        { section_title: 'Chapter 1', content: '# Section 1' },
        { section_title: 'Chapter 2', content: '# Section 2' },
      ]);

      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'chapter-1',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      // 2 section titles + 2 H1 headers
      expect(result.current.toc).toHaveLength(4);
    });

    it('should deduplicate same titles across different chunks', () => {
      const chunks = createMockChunks([
        { section_title: 'Özet', content: '## Giriş' },
        { section_title: 'Özet', content: '## Sonuç' },
      ]);

      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'ozet',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      const ozetItems = result.current.toc.filter((item) => item.id === 'özet');
      expect(ozetItems).toHaveLength(1); // Deduplicated via useMemo filter
    });

    it('should handle chunks without section_title', () => {
      const chunks = createMockChunks([
        {
          section_title: '',
          content: '# Title',
        },
      ]);
      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'title',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      // Should not include a level 1 item for empty section title
      expect(
        result.current.toc.filter((item) => item.level === 1)
      ).toHaveLength(0);
    });
  });

  describe('currentChunkToC Filter', () => {
    it('should return empty array when no active chunk', () => {
      const chunks = createMockChunks([
        { section_title: 'Chapter 1', content: '## Subsection' },
      ]);

      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: '',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      expect(result.current.currentChunkToC).toEqual([]);
    });

    it('should filter ToC by active chunk', () => {
      const chunks = createMockChunks([
        { section_title: 'Chapter 1', content: '## Subsection A' },
        { section_title: 'Chapter 2', content: '## Subsection B' },
      ]);

      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'chapter-1',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      // Should only include items from chapter-1, excluding level 1
      expect(result.current.currentChunkToC).toHaveLength(1);
      expect(result.current.currentChunkToC[0].title).toBe('Subsection A');
    });

    it('should exclude level 1 items from currentChunkToC', () => {
      const chunks = createMockChunks([
        { section_title: 'Chapter 1', content: '# Main\n## Sub' },
      ]);

      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'chapter-1',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      // currentChunkToC should only have level > 1 items
      result.current.currentChunkToC.forEach((item) => {
        expect(item.level).toBeGreaterThan(1);
      });
    });
  });

  describe('Active Section', () => {
    it('should initialize with empty active section', () => {
      const chunks = createMockChunks([{ section_title: 'Test' }]);

      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'test',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      expect(result.current.activeSection).toBe('');
    });

    it('should provide setActiveSection function', () => {
      const chunks = createMockChunks([{ section_title: 'Test' }]);

      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'test',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      expect(typeof result.current.setActiveSection).toBe('function');
    });
  });

  describe('IntersectionObserver', () => {
    it('should not observe when loading', () => {
      const chunks = createMockChunks([{ section_title: 'Test' }]);

      renderHook(() =>
        useTableOfContents({
          chunks,
          loading: true,
          activeChunkId: 'test',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      expect(mockObserve).not.toHaveBeenCalled();
    });

    it('should not observe when chunks are empty', () => {
      renderHook(() =>
        useTableOfContents({
          chunks: [],
          loading: false,
          activeChunkId: 'test',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      expect(mockObserve).not.toHaveBeenCalled();
    });

    it('should disconnect observer on unmount', () => {
      const chunks = createMockChunks([{ section_title: 'Test' }]);
      const { unmount } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'test',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      unmount();
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should update activeSection when an element intersects', async () => {
      const chunks = createMockChunks([
        { section_title: 'Intro', content: '## Section 1\n## Section 2' },
      ]);

      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'intro',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      // Inject mock headers with IDs matching TOC
      injectHeaders([
        { id: 'intro', top: 10 },
        { id: 'section-1', top: 50 },
        { id: 'section-2', top: 100 },
      ]);

      const entries: Partial<IntersectionObserverEntry>[] = [
        {
          isIntersecting: true,
          target: { id: 'section-1' } as HTMLElement,
          boundingClientRect: { top: 50, bottom: 100 } as DOMRect,
        },
        {
          isIntersecting: false,
          target: { id: 'intro' } as HTMLElement,
          boundingClientRect: { top: -10, bottom: 10 } as DOMRect,
        },
      ];

      // Simulate observer callback
      await act(async () => {
        observerCallback(entries);
      });

      await waitFor(() => {
        expect(result.current.activeSection).toBe('section-1');
      });
    });

    it('should pick the topmost element when multiple intersect', async () => {
      const chunks = createMockChunks([{ section_title: 'Test' }]);
      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'test',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      const entries: Partial<IntersectionObserverEntry>[] = [
        {
          isIntersecting: true,
          target: { id: 'lower' } as HTMLElement,
          boundingClientRect: { top: 100, bottom: 200 } as DOMRect,
        },
        {
          isIntersecting: true,
          target: { id: 'upper' } as HTMLElement,
          boundingClientRect: { top: 20, bottom: 50 } as DOMRect,
        },
      ];

      await act(async () => {
        observerCallback(entries);
      });

      await waitFor(() => {
        expect(result.current.activeSection).toBe('upper');
      });
    });

    it('should keep the previous element if it is higher than the current', async () => {
      const chunks = createMockChunks([{ section_title: 'Test' }]);
      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'test',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      const entries: Partial<IntersectionObserverEntry>[] = [
        {
          isIntersecting: true,
          target: { id: 'upper' } as HTMLElement,
          boundingClientRect: { top: 20 } as DOMRect,
        },
        {
          isIntersecting: true,
          target: { id: 'lower' } as HTMLElement,
          boundingClientRect: { top: 100 } as DOMRect,
        },
      ];

      await act(async () => {
        observerCallback(entries);
      });

      await waitFor(() => {
        expect(result.current.activeSection).toBe('upper');
      });
    });

    it('should NOT update activeSection when isProgrammaticScroll is true', async () => {
      const chunks = createMockChunks([{ section_title: 'Test' }]);
      mockIsProgrammaticScroll.current = true;

      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'test',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      const entries: Partial<IntersectionObserverEntry>[] = [
        {
          isIntersecting: true,
          target: { id: 'section-1' } as HTMLElement,
          boundingClientRect: { top: 50, bottom: 100 } as DOMRect,
        },
      ];

      await act(async () => {
        observerCallback(entries);
      });

      expect(result.current.activeSection).toBe('');
    });

    it('should not update activeSection when intersecting is empty', async () => {
      const chunks = createMockChunks([{ section_title: 'Test' }]);
      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'test',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      const entries: Partial<IntersectionObserverEntry>[] = [
        { isIntersecting: false, target: { id: 'test' } as HTMLElement },
      ];

      await act(async () => {
        observerCallback(entries);
      });

      expect(result.current.activeSection).toBe('');
    });

    it('should not update activeSection when topMost has no ID', async () => {
      const chunks = createMockChunks([{ section_title: 'Test' }]);
      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'test',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      const entries: Partial<IntersectionObserverEntry>[] = [
        { isIntersecting: true, target: {} as HTMLElement },
      ];

      await act(async () => {
        observerCallback(entries);
      });

      expect(result.current.activeSection).toBe('');
    });

    it('should not update activeSection if same as current', async () => {
      const chunks = createMockChunks([{ section_title: 'Test' }]);
      const { result } = renderHook(() =>
        useTableOfContents({
          chunks,
          loading: false,
          activeChunkId: 'test',
          mainContentRef: mockMainContentRef,
          isProgrammaticScroll: mockIsProgrammaticScroll,
        })
      );

      // Set initial active section
      await act(async () => {
        observerCallback([
          {
            isIntersecting: true,
            target: { id: 'test' } as HTMLElement,
            boundingClientRect: { top: 10 } as DOMRect,
          },
        ]);
      });
      expect(result.current.activeSection).toBe('test');

      // Trigger again with same ID
      await act(async () => {
        observerCallback([
          {
            isIntersecting: true,
            target: { id: 'test' } as HTMLElement,
            boundingClientRect: { top: 10 } as DOMRect,
          },
        ]);
      });

      expect(result.current.activeSection).toBe('test');
    });
  });
});
