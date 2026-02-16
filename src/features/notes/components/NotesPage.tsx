import React, { useEffect, useState, useMemo, useTransition } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, ChevronUp } from 'lucide-react';
import { getCourseTopics, getCourseIdBySlug } from '@/lib/clientDb';
import { type CourseTopic } from '@/types';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn, slugify } from '@/utils/core';
import { ROUTES } from '@/utils/routes';
import { logger } from '@/utils/logger';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { storage } from '@/lib/storage';

// New Components
import { MarkdownSection } from './MarkdownSection';
import { markdownComponents } from './MarkdownComponents';
import { GlobalNavigation } from './GlobalNavigation';
import { LocalToC } from './LocalToC';

// New Hooks
import { useNotesNavigation } from '../hooks/useNotesNavigation';
import { useTableOfContents } from '../hooks/useTableOfContents';

export default function NotesPage() {
  const { courseSlug, topicSlug } = useParams<{
    courseSlug: string;
    topicSlug?: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Data State
  const [chunks, setChunks] = useState<CourseTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseName, setCourseName] = useState('');

  // React 19 Concurrent Features: useTransition for heavy markdown rendering
  const [isPending, startTransition] = useTransition();

  const activeChunkId = useMemo(() => {
    if (topicSlug) return topicSlug;
    if (chunks.length > 0) return slugify(chunks[0].section_title);
    return '';
  }, [topicSlug, chunks]);

  // Use Custom Hooks
  const {
    mainContentRef,
    scrollProgress,
    isProgrammaticScroll,
    handleScrollToId,
    scrollToTop,
  } = useNotesNavigation({
    courseSlug,
    loading,
    chunks,
    activeChunkId,
  });

  const { activeSection, setActiveSection, currentChunkToC } =
    useTableOfContents({
      chunks,
      loading,
      activeChunkId,
      mainContentRef,
      isProgrammaticScroll,
    });

  // Fetch Data
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function fetchNotes() {
      if (!user?.id || !courseSlug) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const targetId = await getCourseIdBySlug(courseSlug, signal);
        if (signal.aborted) return;
        if (!targetId) {
          setError('Ders bulunamadı.');
          return;
        }

        const cacheKey = `cached_notes_v6_${targetId}`;
        const cached = storage.get<{ data: CourseTopic[]; timestamp: number }>(
          cacheKey
        );
        if (cached?.data) {
          setChunks(cached.data);
          setCourseName(cached.data[0]?.course_name || '');
          setLoading(false);
        }

        const data = await getCourseTopics(user.id, targetId, signal);
        if (signal.aborted) return;

        const processedData = data.map((chunk) => {
          const metadata = chunk.metadata as { images?: string[] } | null;
          const imageUrls = metadata?.images || [];
          let content = chunk.display_content || chunk.content;

          content = content.replace(/[\u2000-\u200b]/g, ' ');

          const usedIndices = new Set<number>();
          imageUrls.forEach((url, idx) => {
            const marker = new RegExp(`\\[GÖRSEL:\\s*${idx}\\]`, 'gi');
            if (content.match(marker)) {
              content = content.replace(marker, `\n\n![Görsel](${url})\n\n`);
              usedIndices.add(idx);
            }
          });

          const unusedImages = imageUrls.filter(
            (_, idx) => !usedIndices.has(idx)
          );
          if (unusedImages.length > 0 && !content.includes('![')) {
            content += unusedImages
              .map((url) => `\n\n![Görsel](${url})`)
              .join('');
          }

          return {
            ...chunk,
            section_title: chunk.section_title,
            content: content,
          };
        });

        // Wrap heavy state updates in startTransition to prevent UI blocking
        if (processedData.length > 0) {
          startTransition(() => {
            setChunks(processedData);
            setCourseName(processedData[0].course_name);
          });
          storage.set(
            cacheKey,
            {
              timestamp: Date.now(),
              data: processedData,
            },
            { ttl: 7 * 24 * 60 * 60 * 1000 }
          ); // 7 days cache
        } else if (!cached) {
          setError('Bu ders için henüz içerik bulunmuyor.');
        }
      } catch (err) {
        if (signal.aborted) return;
        logger.error('Notes loading error', err as Error);
        setError('Notlar yüklenirken bir hata oluştu.');
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    }
    fetchNotes();

    return () => {
      controller.abort();
    };
  }, [courseSlug, user?.id]);

  // Update URL if no topicSlug is present but we have chunks
  useEffect(() => {
    if (!loading && chunks.length > 0 && !topicSlug && courseSlug) {
      const firstChunkId = slugify(chunks[0].section_title);
      navigate(`${ROUTES.NOTES}/${courseSlug}/${firstChunkId}`, {
        replace: true,
      });
    }
  }, [loading, chunks, topicSlug, courseSlug, navigate]);

  const handleGlobalClick = (chunkId: string) => {
    if (courseSlug) {
      navigate(`${ROUTES.NOTES}/${courseSlug}/${chunkId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="ml-3 text-muted-foreground font-medium animate-pulse">
          Ders içeriği hazırlanıyor...
        </p>
      </div>
    );
  }

  if (error || chunks.length === 0) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-6 bg-background text-center">
        <div className="p-4 rounded-full bg-destructive/10 mb-6">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Eyvah!</h1>
        <p className="text-muted-foreground max-w-md mb-8">{error}</p>
        <Button asChild>
          <Link to={ROUTES.COURSES}>Derslere Dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans selection:bg-primary/20">
        {/* 1. Left Panel: Global Navigation */}
        <aside className="w-72 shrink-0 border-r border-border/15 bg-card/10 backdrop-blur-xl hidden lg:block">
          <div className="h-20 flex flex-col justify-center px-6 border-b border-border/10 bg-card/5 relative overflow-hidden">
            <Link
              to={ROUTES.COURSES}
              className="group inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-all duration-300 mb-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100">
                Kütüphane
              </span>
            </Link>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-1 h-3.5 rounded-full bg-primary/40 shrink-0" />
              <h1 className="text-[13px] font-bold text-foreground/90 truncate tracking-tight uppercase">
                {courseName}
              </h1>
            </div>
          </div>
          <div className="h-[calc(100vh-5rem)]">
            <GlobalNavigation
              chunks={chunks}
              activeChunkId={activeChunkId}
              courseSlug={courseSlug || ''}
            />
          </div>
        </aside>

        {/* 2. Middle Panel: Main Content */}
        <main
          ref={mainContentRef}
          className="flex-1 overflow-y-auto bg-background/50 relative scroll-smooth"
          style={{
            opacity: isPending ? 0.7 : 1,
            transition: 'opacity 200ms ease-in-out',
          }}
        >
          <div className="max-w-6xl mx-auto px-8 py-12 min-h-screen">
            {chunks
              .filter((chunk) => slugify(chunk.section_title) === activeChunkId)
              .map((chunk) => (
                <MarkdownSection
                  key={chunk.id}
                  chunk={chunk}
                  components={markdownComponents}
                />
              ))}

            {chunks.length > 0 &&
              !chunks.some(
                (c) => slugify(c.section_title) === activeChunkId
              ) && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <p>Konu bulunamadı veya henüz seçilmedi.</p>
                  <Button
                    variant="link"
                    onClick={() =>
                      handleGlobalClick(slugify(chunks[0].section_title))
                    }
                  >
                    İlk konuya git
                  </Button>
                </div>
              )}
          </div>
        </main>

        {/* 3. Right Panel: Local ToC */}
        <aside
          className="w-64 shrink-0 border-l border-border/15 bg-card/10 backdrop-blur-xl hidden xl:flex flex-col h-full"
          style={{
            opacity: isPending ? 0.7 : 1,
            transition: 'opacity 200ms ease-in-out',
          }}
        >
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            <div className="my-auto w-full">
              <LocalToC
                items={currentChunkToC}
                activeId={activeSection}
                onItemClick={(id, e) => {
                  e.preventDefault();
                  handleScrollToId(id, setActiveSection);
                }}
              />
            </div>
          </div>
        </aside>

        {/* Scroll to Top Button */}
        <button
          onClick={scrollToTop}
          className={cn(
            'fixed bottom-5 right-5 lg:right-70 p-3 rounded-full bg-primary/90 text-primary-foreground shadow-lg transition-all duration-300 z-50 hover:scale-110 hover:shadow-xl hover:bg-primary',
            scrollProgress > 10
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 pointer-events-none'
          )}
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      </div>
    </ErrorBoundary>
  );
}
