import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTableOfContents } from '@/features/notes/hooks/useTableOfContents';
import type { CourseTopic } from '@/shared/types/efficiency';

// Mock slugify
vi.mock('@/shared/lib/core/utils', () => ({
  slugify: (text: string) => text.toLowerCase().replace(/\s+/g, '-'),
}));

// Mock IntersectionObserver
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

class MockIntersectionObserver {
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
      section_title: chunk.section_title || `Section ${index}`,
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

  const mockMainContentRef = {
    current: null as HTMLDivElement | null,
  };

  const mockIsProgrammaticScroll = { current: false };

  beforeEach(() => {
    vi.clearAllMocks();
  });

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
  });
});
