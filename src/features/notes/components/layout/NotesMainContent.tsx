import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, slugify } from '@/utils/stringHelpers';
import {
  NotesHeader,
  NotesCourseOverview,
  MarkdownSection,
} from '@/features/notes/components';
import { CourseTopic } from '@/features/courses/types/courseTypes';

interface NotesMainContentProps {
  content: string;
  activeTab: string;
  selectedTopic: CourseTopic;
  courseTitle: string;
  mainContentRef: React.RefObject<HTMLDivElement | null>;
  setActiveTab: (tab: string) => void;
  // Others
  handleScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  isLeftPanelVisible?: boolean;
  setIsLeftPanelVisible?: (visible: boolean) => void;
  isRightPanelVisible?: boolean;
  setIsRightPanelVisible?: (visible: boolean) => void;
  activeChunkId?: string;
  currentChunk?: CourseTopic | undefined;
  chunks?: CourseTopic[];
  displayProgress?: number;
  totalProgress?: number;
  isSearchOpen?: boolean;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  toggleSearch?: () => void;
  setIsQuizDrawerOpen?: (open: boolean) => void;
  transformedContent?: string;
  handleGlobalClick?: (id: string) => void;
}

export function NotesMainContent(props: NotesMainContentProps) {
  const { mainContentRef } = props;

  const handleScroll = props.handleScroll || (() => {});
  const isLeftPanelVisible = props.isLeftPanelVisible || false;
  const setIsLeftPanelVisible = props.setIsLeftPanelVisible || (() => {});
  const isRightPanelVisible = props.isRightPanelVisible || false;
  const setIsRightPanelVisible = props.setIsRightPanelVisible || (() => {});
  const activeChunkId = props.activeChunkId || '';
  const currentChunk = props.currentChunk || props.selectedTopic;
  const chunks = props.chunks || [props.selectedTopic];
  const displayProgress = props.displayProgress || 0;
  const totalProgress = props.totalProgress || 100;
  const isSearchOpen = props.isSearchOpen || false;
  const searchQuery = props.searchQuery || '';
  const setSearchQuery = props.setSearchQuery || (() => {});
  const toggleSearch = props.toggleSearch || (() => {});
  const setIsQuizDrawerOpen = props.setIsQuizDrawerOpen || (() => {});
  const transformedContent = props.transformedContent || props.content;
  const handleGlobalClick = props.handleGlobalClick || (() => {});

  return (
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
                  (chunk) => slugify(chunk.section_title) === activeChunkId
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
                      handleGlobalClick(slugify(chunks[0].section_title))
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
  );
}
