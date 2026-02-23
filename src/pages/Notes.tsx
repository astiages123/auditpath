import { useParams, Link } from 'react-router-dom';
import {
  Loader2,
  AlertCircle,
  ChevronUp,
  BookText,
  ArrowLeft,
} from 'lucide-react';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn, slugify } from '@/utils/stringHelpers';
import { ROUTES } from '@/utils/routes';
import { ErrorBoundary } from '@/components/ui/error-boundary';

import {
  MarkdownSection,
  markdownComponents,
  GlobalNavigation,
  LocalToC,
} from '@/features/notes/components';

import { useNotesData } from '@/features/notes/hooks/useNotesData';
import { useNotesPage } from '@/features/notes/hooks/useNotesPage';

export default function NotesPage() {
  const { courseSlug, topicSlug } = useParams<{
    courseSlug: string;
    topicSlug?: string;
  }>();
  const { user } = useAuth();

  const { chunks, loading, error, courseName, isPending } = useNotesData({
    courseSlug: courseSlug || '',
    userId: user?.id,
  });

  const {
    activeChunkId,
    readingTimeMinutes,
    mainContentRef,
    scrollProgress,
    handleScrollToId,
    scrollToTop,
    activeSection,
    setActiveSection,
    currentChunkToC,
    handleGlobalClick,
  } = useNotesPage({
    courseSlug,
    topicSlug,
    chunks,
    loading,
  });

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
          <Link to={ROUTES.HOME}>Derslere Dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans selection:bg-primary/20">
        <aside className="w-60 shrink-0 bg-muted/20 backdrop-blur-xl hidden lg:block pt-5 shadow-[1px_0_10px_0_rgba(0,0,0,0.02)]">
          <div className="h-20 flex flex-col justify-center px-6 relative overflow-hidden mb-4">
            <Link
              to={ROUTES.HOME}
              className="group inline-flex items-center gap-2 text-foreground hover:text-primary transition-all duration-300"
            >
              <ArrowLeft className="size-3.5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[12px] font-medium group-hover:opacity-100">
                Ana Sayfa
              </span>
            </Link>

            <div className="mt-2 flex items-center gap-2 min-w-0">
              <BookText className="size-4 text-foreground" />
              <h1 className="text-sm font-bold text-foreground truncate tracking-tight">
                {courseName?.toLocaleUpperCase('tr-TR')}
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

        <main
          ref={mainContentRef}
          className="flex-1 overflow-y-auto bg-background/50 relative scroll-smooth"
          style={{
            opacity: isPending ? 0.7 : 1,
            transition: 'opacity 200ms ease-in-out',
          }}
        >
          <div className="max-w-6xl mx-auto min-h-screen px-8 py-12">
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

        <aside
          className="w-64 shrink-0 bg-muted/20 backdrop-blur-xl hidden xl:flex flex-col h-full shadow-[-1px_0_10px_0_rgba(0,0,0,0.02)]"
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
                readingTimeMinutes={readingTimeMinutes}
                onItemClick={(id, e) => {
                  e.preventDefault();
                  handleScrollToId(id, setActiveSection);
                }}
              />
            </div>
          </div>
        </aside>

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
