import type { CSSProperties, MouseEvent } from 'react';
import { ROUTES } from '@/utils/routes';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NotebookPen, Layout } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotesPageLogic } from '@/features/notes/hooks/useNotesPageLogic';
import {
  NotesMainContent,
  NotesLeftPanel,
  NotesMobileTopics,
  LocalToC,
  type LocalToCItem,
} from '@/features/notes/components';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import { cn } from '@/utils/stringHelpers';

export function NotesPageContent() {
  const {
    loading,
    error,
    courseSlug,
    courseName,
    topics,
    selectedTopic,
    content,
    isLeftPanelOpen,
    isMobileMenuOpen,
    activeTab,
    mainContentRef,
    setIsLeftPanelOpen,
    setIsMobileMenuOpen,
    setActiveTab,
    activeChunkId,
    currentChunk,
    isRightPanelVisible,
    setIsRightPanelVisible,
    displayProgress,
    totalProgress,
    isSearchOpen,
    searchQuery,
    setSearchQuery,
    toggleSearch,
    handleScroll,
    currentChunkToC,
    activeSection,
    setActiveSection,
    handleScrollToId,
    handleGlobalClick,
    handleSearchResultClick,
    debouncedQuery,
    results,
  } = useNotesPageLogic();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
    );
  }

  if (error || (!selectedTopic && activeChunkId !== '')) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <NotebookPen className="mb-4 h-16 w-16 text-muted-foreground opacity-20" />
        <h2 className="mb-2 text-2xl font-bold">Bir Hata Oluştu</h2>
        <p className="mb-6 text-muted-foreground">
          Notlar yüklenirken bir problem yaşandı veya konu bulunamadı.
        </p>
        <Link to={ROUTES.HOME}>
          <Button variant="outline">
            <Layout className="mr-2 h-4 w-4" />
            Ana Sayfaya Dön
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
        <div
          className={cn(
            'flex-1 min-h-0 flex flex-col lg:grid gap-4 px-2 py-4 lg:px-4 h-full transition-all duration-300 ease-in-out overflow-hidden',
            activeChunkId !== ''
              ? 'lg:grid-cols-[var(--left-panel-width)_1fr_var(--right-panel-width)]'
              : 'lg:grid-cols-[var(--left-panel-width)_1fr]'
          )}
          style={
            {
              '--left-panel-width': isLeftPanelOpen ? '240px' : '0px',
              '--right-panel-width': isRightPanelVisible ? '220px' : '0px',
            } as CSSProperties
          }
        >
          <NotesLeftPanel
            chunks={topics}
            activeChunkId={selectedTopic?.id || activeChunkId}
            isVisible={isLeftPanelOpen}
            courseSlug={courseSlug || ''}
            debouncedQuery={debouncedQuery}
            results={results}
            onSearchResultClick={handleSearchResultClick}
            onToggle={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          />

          <NotesMainContent
            content={content}
            activeTab={activeTab}
            selectedTopic={selectedTopic as CourseTopic}
            courseTitle={courseName}
            mainContentRef={mainContentRef}
            setActiveTab={setActiveTab}
            isLeftPanelVisible={isLeftPanelOpen}
            setIsLeftPanelVisible={setIsLeftPanelOpen}
            isRightPanelVisible={isRightPanelVisible}
            setIsRightPanelVisible={setIsRightPanelVisible}
            activeChunkId={activeChunkId}
            currentChunk={currentChunk}
            chunks={topics}
            displayProgress={displayProgress}
            totalProgress={totalProgress}
            isSearchOpen={isSearchOpen}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            toggleSearch={toggleSearch}
            transformedContent={content}
            handleGlobalClick={handleGlobalClick}
            handleScroll={handleScroll}
            currentChunkToC={currentChunkToC}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            handleScrollToId={handleScrollToId}
          />

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
                  items={(currentChunkToC as LocalToCItem[]) || []}
                  activeId={activeSection || ''}
                  onItemClick={(id: string, e: MouseEvent) => {
                    e.preventDefault();
                    if (handleScrollToId && setActiveSection) {
                      handleScrollToId(id, setActiveSection);
                    }
                  }}
                  onToggle={() => setIsRightPanelVisible(false)}
                />
              </div>
            </aside>
          )}
        </div>

        <NotesMobileTopics
          topics={topics}
          selectedTopicId={selectedTopic?.id || activeChunkId}
          courseSlug={courseSlug || ''}
          isMobileMenuOpen={isMobileMenuOpen}
          debouncedQuery={debouncedQuery}
          results={results}
          onSearchResultClick={(result) => {
            handleSearchResultClick(result);
            setIsMobileMenuOpen(false);
          }}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
