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
  transformedContent?: string;
  handleGlobalClick?: (id: string) => void;
  currentChunkToC?: unknown[];
  activeSection?: string;
  setActiveSection?: (id: string) => void;
  handleScrollToId?: (id: string, setActive: (id: string) => void) => void;
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
  const transformedContent = props.transformedContent || props.content;
  const handleGlobalClick = props.handleGlobalClick || (() => {});

  return (
    <main className="flex flex-col min-h-0 flex-1 bg-card rounded-xl border h-full overflow-hidden">
      <NotesHeader
        onOpenMenu={() => setIsLeftPanelVisible(true)}
        activeChunkId={activeChunkId}
        currentChunk={currentChunk}
        courseName={chunks[0]?.course_name || 'Ders Notları'}
        courseSlug={props.courseTitle}
        displayProgress={displayProgress}
        isSearchOpen={isSearchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        toggleSearch={toggleSearch}
        isLeftPanelVisible={isLeftPanelVisible}
        setIsLeftPanelVisible={setIsLeftPanelVisible}
        isRightPanelVisible={isRightPanelVisible}
        setIsRightPanelVisible={setIsRightPanelVisible}
      />

      <div
        ref={mainContentRef}
        id="notes-scroll-container"
        onScroll={handleScroll}
        className={cn(
          'flex-1 min-h-0 p-4 lg:p-6 flex flex-col overflow-y-auto custom-scrollbar',
          'mx-auto w-full'
        )}
      >
        <div className="relative w-full flex-1 flex flex-col min-h-0 mx-auto transition-all duration-300">
          <div
            className={cn(
              'w-full flex-1 flex flex-col min-h-0 transition-all duration-300',
              !isLeftPanelVisible && !isRightPanelVisible
                ? 'max-w-full lg:px-8'
                : 'max-w-6xl mx-auto'
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
