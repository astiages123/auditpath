import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { slugify } from '@/utils/stringHelpers';
import { ROUTES } from '@/utils/routes';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { GlobalBreadcrumb } from '@/shared/components/GlobalBreadcrumb';

import {
  MarkdownSection,
  markdownComponents,
  GlobalNavigation,
  LocalToC,
  ScrollToTopButton,
} from '@/features/notes/components';

import { useNotesData } from '@/features/notes/hooks/useNotesData';
import { useNotesPage } from '@/features/notes/hooks/useNotesPage';

export default function NotesPage() {
  const { courseSlug, topicSlug } = useParams<{
    courseSlug: string;
    topicSlug?: string;
  }>();
  const { user } = useAuth();

  const { chunks, loading, error, isPending } = useNotesData({
    courseSlug: courseSlug || '',
    userId: user?.id,
  });

  const {
    activeChunkId,
    readingTimeMinutes,
    mainContentRef,
    handleScrollToId,
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
      <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground font-sans selection:bg-primary/20">
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md px-6 py-3 border-b border-border/10 shrink-0">
          <GlobalBreadcrumb />
        </div>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-56 shrink-0 bg-muted/20 backdrop-blur-xl hidden lg:block h-full overflow-y-auto scrollbar-hide shadow-[1px_0_10px_0_rgba(0,0,0,0.02)]">
            <div className="h-full">
              <GlobalNavigation
                chunks={chunks}
                activeChunkId={activeChunkId}
                courseSlug={courseSlug || ''}
              />
            </div>
          </aside>

          <main
            ref={mainContentRef}
            id="notes-scroll-container"
            className="flex-1 bg-background/50 relative overflow-y-auto h-full"
            style={{
              opacity: isPending ? 0.7 : 1,
              transition: 'opacity 200ms ease-in-out',
            }}
          >
            <div className="min-h-screen px-4">
              {chunks
                .filter(
                  (chunk) => slugify(chunk.section_title) === activeChunkId
                )
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
            className="w-60 shrink-0 bg-muted/20 backdrop-blur-xl hidden xl:flex flex-col h-full overflow-y-auto scrollbar-hide shadow-[-1px_0_10px_0_rgba(0,0,0,0.02)]"
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
        </div>
      </div>
      <ScrollToTopButton />
    </ErrorBoundary>
  );
}
