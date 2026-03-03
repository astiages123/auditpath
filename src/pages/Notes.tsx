import { useNavigate, useParams } from 'react-router-dom';
import { PanelLeftOpen, PanelRightOpen, X } from 'lucide-react';

import { type CourseTopic } from '@/features/courses/types/courseTypes';
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
  SearchResultsSidebar,
  NotesHeader,
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
                'flex-1 min-h-0 lg:grid gap-4 px-2 lg:px-4 h-full transition-all duration-300 ease-in-out overflow-hidden',
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
                  // Desktop: grid column olarak kalır
                  'hidden lg:flex flex-col shrink-0 border rounded-xl bg-card overflow-hidden transition-all duration-300 ease-in-out lg:h-full',
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
                <NotesHeader
                  onOpenMenu={() => setIsLeftPanelVisible(true)}
                  activeChunkId={activeChunkId}
                  currentChunk={currentChunk}
                  courseName={chunks[0]?.course_name || 'Ders Notları'}
                  displayProgress={displayProgress}
                  isSearchOpen={isSearchOpen}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  toggleSearch={toggleSearch}
                  setIsQuizDrawerOpen={setIsQuizDrawerOpen}
                />

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
                      <div className="hidden lg:flex absolute -left-2 lg:-left-4 top-0 h-full items-start pt-4 z-30">
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
                      <div className="hidden lg:flex absolute -right-2 lg:-right-4 top-0 h-full items-start pt-4 z-30">
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
                          .map((chunk: CourseTopic) => (
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

        {/* Mobile Topics Modal */}
        {isLeftPanelVisible && (
          <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-background animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border/20">
              <span className="text-base font-bold">İçindekiler</span>
              <button
                onClick={() => setIsLeftPanelVisible(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {debouncedQuery && debouncedQuery.length >= 2 ? (
                <SearchResultsSidebar
                  results={results}
                  query={debouncedQuery}
                  onResultClick={(id) => {
                    handleSearchResultClick(id);
                    setIsLeftPanelVisible(false);
                  }}
                />
              ) : (
                <GlobalNavigation
                  chunks={chunks}
                  activeChunkId={activeChunkId}
                  courseSlug={courseSlug || ''}
                  onItemClick={() => setIsLeftPanelVisible(false)}
                  onToggle={() => setIsLeftPanelVisible(false)}
                />
              )}
            </div>
          </div>
        )}
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
