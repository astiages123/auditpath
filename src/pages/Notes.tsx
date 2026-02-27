import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  // Loader2 removed as it was unused
  BookOpen,
  Brain,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
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
  LocalToC,
} from '@/features/notes/components';

import { SplitLayoutSkeleton } from '@/shared/components/SkeletonTemplates';

import { useNotesData } from '@/features/notes/hooks/useNotesData';
import { useNotesPage } from '@/features/notes/hooks/useNotesPage';
import { QuizDrawer } from '@/features/quiz/components/QuizDrawer';

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

  const {
    activeChunkId,
    mainContentRef,
    handleGlobalClick,
    currentChunkToC,
    activeSection,
    setActiveSection,
    handleScrollToId,
  } = useNotesPage({
    courseSlug,
    topicSlug,
    chunks,
    loading,
  });

  const currentChunk = chunks.find(
    (c) => slugify(c.section_title) === activeChunkId
  );

  // Panel visibility states
  const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(true);
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(true);

  // Quiz drawer state (drawer bir sonraki adımda bağlanacak)
  const [isQuizDrawerOpen, setIsQuizDrawerOpen] = useState(false);

  // Local state for smooth UI updates during scroll
  const [localProgress, setLocalProgress] = useState(0);

  // Overall course progress for the overview page
  const totalProgress = useMemo(() => {
    if (!chunks.length) return 0;
    return Math.round(localProgress);
  }, [chunks.length, localProgress]);

  const displayProgress = currentChunk ? localProgress : 0;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (!container) return;

    const scrollHeight = container.scrollHeight - container.clientHeight;
    if (scrollHeight <= 0) return;

    const progress = Math.min(
      100,
      Math.round((container.scrollTop / scrollHeight) * 100)
    );

    setLocalProgress(progress);
  };

  if (loading) {
    return <SplitLayoutSkeleton />;
  }

  if (error || chunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Kurs bulunamadı.</p>
        <Button onClick={() => navigate(ROUTES.LIBRARY)}>
          Çalışma Merkezi'ne Dön
        </Button>
      </div>
    );
  }

  return (
    <>
      <ErrorBoundary>
        <div
          className={cn(
            'flex flex-col h-[calc(100vh-96px)] lg:h-[calc(100vh-128px)] overflow-hidden'
          )}
        >
          <div
            className={cn(
              'flex-1 min-h-0 flex flex-col lg:grid gap-4 px-2 lg:px-4 h-full transition-all duration-300 ease-in-out overflow-hidden',
              activeChunkId !== ''
                ? 'lg:grid-cols-[var(--left-panel-width)_1fr_var(--right-panel-width)]'
                : 'lg:grid-cols-[var(--left-panel-width)_1fr]'
            )}
            style={
              {
                '--left-panel-width': isLeftPanelVisible ? '240px' : '0px',
                '--right-panel-width': isRightPanelVisible ? '220px' : '0px',
              } as React.CSSProperties
            }
          >
            <aside
              className={cn(
                'flex flex-col shrink-0 border rounded-xl bg-card h-[400px] lg:h-full z-20 overflow-hidden transition-all duration-300 ease-in-out',
                !isLeftPanelVisible &&
                  'lg:w-0 lg:opacity-0 lg:border-none lg:pointer-events-none'
              )}
            >
              <div className="min-w-[240px] h-full flex flex-col">
                <GlobalNavigation
                  chunks={chunks}
                  activeChunkId={activeChunkId}
                  courseSlug={courseSlug || ''}
                />
              </div>
            </aside>

            <main className="flex flex-col min-h-0 flex-1 bg-card rounded-xl border h-full overflow-hidden">
              <div
                id="notes-sticky-header"
                className="group flex flex-col border-b border-border/10 shrink-0 bg-card/80 backdrop-blur-md z-10 transition-all duration-300"
              >
                <div className="flex items-center gap-3 px-6 py-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setIsLeftPanelVisible(!isLeftPanelVisible)}
                  >
                    {isLeftPanelVisible ? (
                      <PanelLeftClose className="w-5 h-5" />
                    ) : (
                      <PanelLeftOpen className="w-5 h-5" />
                    )}
                  </Button>

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

                  <div className="flex items-center gap-3">
                    {currentChunk && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-muted-foreground line-clamp-1">
                          %{displayProgress}
                        </span>
                      </div>
                    )}

                    {activeChunkId !== '' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1.5 text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-colors font-black text-[11px] uppercase tracking-wider"
                          onClick={() => {
                            // console.log('quiz drawer açılacak');
                            setIsQuizDrawerOpen(true);
                          }}
                        >
                          <Brain className="w-3.5 h-3.5" />
                          Sınava Gir
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                          onClick={() =>
                            setIsRightPanelVisible(!isRightPanelVisible)
                          }
                        >
                          {isRightPanelVisible ? (
                            <PanelRightClose className="w-5 h-5" />
                          ) : (
                            <PanelRightOpen className="w-5 h-5" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
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
                  'flex-1 min-h-0 p-4 lg:p-6 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar',
                  'mx-auto w-full'
                )}
              >
                <div
                  className={cn(
                    'w-full flex-1 flex flex-col min-h-0 mx-auto transition-all duration-300',
                    !isLeftPanelVisible && !isRightPanelVisible
                      ? 'max-w-full lg:px-8'
                      : 'max-w-6xl'
                  )}
                >
                  {activeChunkId === '' ? (
                    <NotesCourseOverview
                      courseName={chunks[0]?.course_name || 'Ders'}
                      totalProgress={totalProgress}
                      totalTopics={chunks.length}
                    />
                  ) : (
                    chunks
                      .filter(
                        (chunk) =>
                          slugify(chunk.section_title) === activeChunkId
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

            {activeChunkId !== '' && (
              <aside
                className={cn(
                  'hidden lg:flex flex-col shrink-0 border rounded-xl bg-card h-full overflow-hidden transition-all duration-300 ease-in-out',
                  !isRightPanelVisible &&
                    'lg:w-0 lg:opacity-0 lg:border-none lg:pointer-events-none'
                )}
              >
                <div className="min-w-[220px] h-full flex flex-col">
                  <LocalToC
                    items={currentChunkToC}
                    activeId={activeSection}
                    onItemClick={(id: string) =>
                      handleScrollToId(id, setActiveSection)
                    }
                  />
                </div>
              </aside>
            )}
          </div>
        </div>
      </ErrorBoundary>

      <QuizDrawer
        isOpen={isQuizDrawerOpen}
        onClose={() => setIsQuizDrawerOpen(false)}
        courseId={chunks[0]?.course_id || ''}
        courseSlug={courseSlug || ''}
        courseName={chunks[0]?.course_name || ''}
        initialChunkId={activeChunkId || undefined}
        initialTopicName={currentChunk?.section_title || undefined}
      />
    </>
  );
}
