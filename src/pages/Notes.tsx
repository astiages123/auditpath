import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, BookOpen } from 'lucide-react';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn, slugify } from '@/utils/stringHelpers';
import { ROUTES } from '@/utils/routes';
import { ErrorBoundary } from '@/components/ui/error-boundary';

import {
  MarkdownSection,
  markdownComponents,
  GlobalNavigation,
  NotesCourseOverview,
} from '@/features/notes/components';

import { useNotesData } from '@/features/notes/hooks/useNotesData';
import { useNotesPage } from '@/features/notes/hooks/useNotesPage';

export default function NotesPage() {
  const { courseSlug, topicSlug } = useParams<{
    courseSlug: string;
    topicSlug?: string;
  }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { chunks, loading, error } = useNotesData({
    courseSlug: courseSlug || '',
    userId: user?.id,
  });

  const { activeChunkId, mainContentRef, handleGlobalClick } = useNotesPage({
    courseSlug,
    topicSlug,
    chunks,
    loading,
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin size-8 text-primary" />
        <p className="mt-4 text-muted-foreground animate-pulse">
          Ders içeriği hazırlanıyor...
        </p>
      </div>
    );
  }

  if (error || chunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Kurs bulunamadı.</p>
        <Button onClick={() => navigate(ROUTES.HOME)}>Ana Sayfaya Dön</Button>
      </div>
    );
  }

  const currentChunk = chunks.find(
    (c) => slugify(c.section_title) === activeChunkId
  );

  const excludedRoutes = [
    '/notes/finans-matematigi',
    '/notes/finans-matematigi/tek-odemeli-islemler',
  ];
  const isExcluded = excludedRoutes.includes(location.pathname);

  return (
    <ErrorBoundary>
      <div className={cn('flex flex-col h-full')}>
        <div
          className={cn(
            'flex-1 min-h-0 flex overflow-hidden',
            'grid lg:grid-cols-[280px_1fr] gap-6'
          )}
        >
          <aside className="sticky top-0 self-start flex flex-col min-h-0 border rounded-xl bg-card/40 h-full">
            <div className="h-full overflow-y-auto custom-scrollbar">
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
            className="flex flex-col min-h-0 flex-1 bg-card/40 rounded-xl border h-full overflow-y-auto overflow-x-hidden custom-scrollbar"
          >
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border/10 shrink-0 sticky top-0 bg-card/80 backdrop-blur-md z-10">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground truncate">
                  {activeChunkId === ''
                    ? chunks[0]?.course_name || 'Ders Notları'
                    : currentChunk?.section_title || 'Konu İçeriği'}
                </h3>
                <p className="text-xs text-muted-foreground">Ders Notları</p>
              </div>
            </div>

            <div className="flex-1 min-h-0 p-6 flex flex-col">
              <div
                className={cn(
                  'mx-auto w-full flex-1 flex flex-col min-h-0',
                  isExcluded ? 'max-w-4xl' : 'max-w-6xl'
                )}
              >
                {activeChunkId === '' ? (
                  <NotesCourseOverview
                    courseName={chunks[0]?.course_name || 'Ders'}
                    onStartReading={() =>
                      handleGlobalClick(slugify(chunks[0].section_title))
                    }
                  />
                ) : (
                  chunks
                    .filter(
                      (chunk) => slugify(chunk.section_title) === activeChunkId
                    )
                    .map((chunk) => (
                      <MarkdownSection
                        key={chunk.id}
                        chunk={chunk}
                        components={markdownComponents}
                      />
                    ))
                )}

                {chunks.length > 0 &&
                  activeChunkId !== '' &&
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
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
