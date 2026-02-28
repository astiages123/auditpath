import { useNavigate, useParams } from 'react-router-dom';
import {
  BookOpen,
  Brain,
  Clock,
  PanelLeftOpen,
  PanelRightOpen,
  Search,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, slugify } from '@/utils/stringHelpers';
import { ROUTES } from '@/utils/routes';
import { ErrorBoundary } from '@/components/ui/error-boundary';

import {
  MarkdownSection,
  GlobalNavigation,
  NotesCourseOverview,
  LocalToC,
  SearchResultsSidebar,
} from '@/features/notes/components';

import { SplitLayoutSkeleton } from '@/shared/components/SkeletonTemplates';
import { PageContainer } from '@/components/layout/PageContainer';

import { useNotesData } from '@/features/notes/hooks/useNotesData';
import { useNotesPage } from '@/features/notes/hooks/useNotesPage';
import { useNotesUI } from '@/features/notes/hooks/useNotesUI';
import { useNotesSearch } from '@/features/notes/hooks/useNotesSearch';
import { useNotesHighlight } from '@/features/notes/hooks/useNotesHighlight';
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

  const {
    isLeftPanelVisible,
    setIsLeftPanelVisible,
    isRightPanelVisible,
    setIsRightPanelVisible,
    isQuizDrawerOpen,
    setIsQuizDrawerOpen,
    displayProgress,
    totalProgress,
    handleScroll,
  } = useNotesUI({ chunks, activeChunkId });

  const {
    isSearchOpen,
    searchQuery,
    setSearchQuery,
    results,
    debouncedQuery,
    handleSearchResultClick,
    toggleSearch,
  } = useNotesSearch({
    content: currentChunk?.content || '',
    containerRef: mainContentRef,
  });

  const transformedContent = useNotesHighlight({
    currentChunk,
    debouncedQuery,
  });

  return (
    <>
      <PageContainer
        isLoading={loading}
        loadingFallback={<SplitLayoutSkeleton />}
        error={error}
        isEmpty={chunks.length === 0}
        emptyFallback={
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <p className="text-muted-foreground">Kurs bulunamadı.</p>
            <Button onClick={() => navigate(ROUTES.LIBRARY)}>
              Çalışma Merkezi'ne Dön
            </Button>
          </div>
        }
      >
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
                  {debouncedQuery && debouncedQuery.length >= 2 ? (
                    <SearchResultsSidebar
                      results={results}
                      query={debouncedQuery}
                      onResultClick={handleSearchResultClick}
                    />
                  ) : (
                    <GlobalNavigation
                      chunks={chunks}
                      activeChunkId={activeChunkId}
                      courseSlug={courseSlug || ''}
                      onToggle={() => setIsLeftPanelVisible(false)}
                    />
                  )}
                </div>
              </aside>

              <main className="flex flex-col min-h-0 flex-1 bg-card rounded-xl border h-full overflow-hidden">
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
                                    currentChunk.content.split(/\s+/).length /
                                      200
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
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-muted-foreground line-clamp-1">
                              %{displayProgress}
                            </span>
                          </div>
                        </>
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

                          <div className="flex items-center">
                            <AnimatePresence>
                              {isSearchOpen && (
                                <motion.div
                                  initial={{ width: 0, opacity: 0, x: 20 }}
                                  animate={{ width: 180, opacity: 1, x: 0 }}
                                  exit={{ width: 0, opacity: 0, x: 20 }}
                                  transition={{
                                    type: 'spring',
                                    damping: 20,
                                    stiffness: 300,
                                  }}
                                  className="overflow-hidden mr-1"
                                >
                                  <Input
                                    value={searchQuery}
                                    onChange={(e) =>
                                      setSearchQuery(e.target.value)
                                    }
                                    placeholder="Ara..."
                                    className="h-9 w-[170px] bg-background border-border rounded-sm text-[13px] border focus:ring-0 focus-visible:ring-0 focus:border-primary/50 transition-colors shadow-none"
                                    autoFocus
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'shrink-0 transition-colors',
                                isSearchOpen
                                  ? 'text-primary bg-primary/10'
                                  : 'text-muted-foreground hover:text-primary'
                              )}
                              onClick={toggleSearch}
                            >
                              {isSearchOpen ? (
                                <X className="w-5 h-5" />
                              ) : (
                                <Search className="w-5 h-5" />
                              )}
                            </Button>
                          </div>
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
                  <div className="relative w-full flex-1 flex flex-col min-h-0 mx-auto transition-all duration-300">
                    {/* Floating Side Triggers */}
                    {!isLeftPanelVisible && (
                      <div className="absolute -left-2 lg:-left-4 top-0 h-full flex items-start pt-4 z-30">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-10 w-6 rounded-l-none rounded-r-xl border shadow-sm hover:w-8 transition-all group/trigger bg-card/80 backdrop-blur-sm"
                          onClick={() => setIsLeftPanelVisible(true)}
                        >
                          <PanelLeftOpen className="w-4 h-4 text-primary group-hover/trigger:scale-110 transition-transform" />
                        </Button>
                      </div>
                    )}

                    {!isRightPanelVisible && activeChunkId !== '' && (
                      <div className="absolute -right-2 lg:-right-4 top-0 h-full flex items-start pt-4 z-30">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-10 w-6 rounded-r-none rounded-l-xl border shadow-sm hover:w-8 transition-all group/trigger bg-card/80 backdrop-blur-sm"
                          onClick={() => setIsRightPanelVisible(true)}
                        >
                          <PanelRightOpen className="w-4 h-4 text-primary group-hover/trigger:scale-110 transition-transform" />
                        </Button>
                      </div>
                    )}

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
                            <MarkdownSection
                              key={chunk.id}
                              chunk={{
                                ...chunk,
                                content: transformedContent,
                              }}
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
                                handleGlobalClick(
                                  slugify(chunks[0].section_title)
                                )
                              }
                            >
                              İlk konuya git
                            </Button>
                          </div>
                        )}
                    </div>
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
                      onItemClick={(id: string, e: React.MouseEvent) => {
                        e.preventDefault();
                        handleScrollToId(id, setActiveSection);
                      }}
                      onToggle={() => setIsRightPanelVisible(false)}
                    />
                  </div>
                </aside>
              )}
            </div>
          </div>
        </ErrorBoundary>
      </PageContainer>

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
