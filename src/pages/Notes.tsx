import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, BookOpen, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn, slugify } from '@/utils/stringHelpers';
import { ROUTES } from '@/utils/routes';
import { ErrorBoundary } from '@/components/ui/error-boundary';

import {
  MarkdownSection,
  GlobalNavigation,
  NotesCourseOverview,
} from '@/features/notes/components';

import { useNotesData } from '@/features/notes/hooks/useNotesData';
import { useNotesPage } from '@/features/notes/hooks/useNotesPage';
import { useNotesProgress } from '@/features/notes/hooks/useNotesProgress';

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

  const currentChunk = chunks.find(
    (c) => slugify(c.section_title) === activeChunkId
  );

  // saved reading progress from DB/hook
  const { readingProgress, updateProgress } = useNotesProgress(
    user?.id,
    chunks[0]?.course_id
  );

  // Local state for smooth UI updates during scroll
  const [localProgress, setLocalProgress] = useState(0);

  // Overall course progress for the overview page
  const totalProgress = useMemo(() => {
    if (!chunks.length) return 0;
    const progressValues = chunks.map((c) => readingProgress[c.id] || 0);
    const sum = progressValues.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / chunks.length);
  }, [chunks, readingProgress]);

  // Display progress - use synced value from readingProgress when chunk changes, otherwise use local
  const displayProgress = currentChunk
    ? (readingProgress[currentChunk.id] ?? localProgress)
    : localProgress;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (!container || !currentChunk) return;

    const scrollHeight = container.scrollHeight - container.clientHeight;
    if (scrollHeight <= 0) return;

    const progress = Math.min(
      100,
      Math.round((container.scrollTop / scrollHeight) * 100)
    );

    // Update local state instantly (bidirectional)
    setLocalProgress(progress);

    // Persist only if increased
    if (progress > (readingProgress[currentChunk.id] || 0)) {
      updateProgress(currentChunk.id, progress);
    }
  };

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

  const excludedRoutes = [
    '/notes/finans-matematigi',
    '/notes/finans-matematigi/tek-odemeli-islemler',
  ];
  const isExcluded = excludedRoutes.includes(location.pathname);

  return (
    <ErrorBoundary>
      <div
        className={cn(
          'flex flex-col h-[calc(100vh-96px)] lg:h-[calc(100vh-128px)] overflow-hidden'
        )}
      >
        <div
          className={cn(
            'flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden',
            'lg:grid lg:grid-cols-[280px_1fr] gap-6 px-4 lg:px-6 h-full'
          )}
        >
          <aside className="flex flex-col shrink-0 border rounded-xl bg-card/40 h-[400px] lg:h-full z-20 overflow-hidden">
            <GlobalNavigation
              chunks={chunks}
              activeChunkId={activeChunkId}
              courseSlug={courseSlug || ''}
            />
          </aside>

          <main className="flex flex-col min-h-0 flex-1 bg-card/40 rounded-xl border h-full overflow-hidden">
            <div
              id="notes-sticky-header"
              className="group flex flex-col border-b border-border/10 shrink-0 bg-card/80 backdrop-blur-md z-10 transition-all duration-300"
            >
              <div className="flex items-center gap-3 px-6 py-4">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground truncate">
                    {activeChunkId === ''
                      ? chunks[0]?.course_name || 'Ders Notları'
                      : currentChunk?.section_title || 'Konu İçeriği'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                      Ders Notları
                    </p>
                    {currentChunk && (
                      <>
                        <span className="text-muted-foreground/30 text-[10px]">
                          •
                        </span>
                        <div className="flex items-center gap-1 text-primary/80">
                          <Clock className="w-3 h-3" />
                          <span className="text-[10px] font-bold">
                            {Math.max(
                              1,
                              Math.ceil(
                                currentChunk.content.split(/\s+/).length / 200
                              )
                            )}{' '}
                            dk
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {currentChunk && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-muted-foreground">
                      %{displayProgress}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar Component */}
              {currentChunk && (
                <div className="h-0.5 w-full bg-primary/5">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${displayProgress}%`,
                    }}
                    transition={{
                      type: 'spring',
                      bounce: 0,
                      duration: 0.5,
                    }}
                  />
                </div>
              )}
            </div>

            <div
              ref={mainContentRef}
              id="notes-scroll-container"
              onScroll={handleScroll}
              className={cn(
                'flex-1 min-h-0 p-6 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar',
                'mx-auto w-full'
              )}
            >
              <div
                className={cn(
                  'w-full flex-1 flex flex-col min-h-0 mx-auto',
                  isExcluded ? 'max-w-4xl' : 'max-w-6xl'
                )}
              >
                {activeChunkId === '' ? (
                  <NotesCourseOverview
                    courseName={chunks[0]?.course_name || 'Ders'}
                    totalProgress={totalProgress}
                    totalTopics={chunks.length}
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
                      <MarkdownSection key={chunk.id} chunk={chunk} />
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
