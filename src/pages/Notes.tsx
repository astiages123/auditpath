import { ROUTES } from '@/utils/routes';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NotebookPen, Layout, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScoreTypeRadarModal } from '@/features/statistics/components/modals/ScoreTypeRadarModal';
import { useNotesPageLogic } from '@/features/notes/hooks/useNotesPageLogic';
import { NotesLeftPanel } from '@/features/notes/components/layout/NotesLeftPanel';
import { NotesMainContent } from '@/features/notes/components/layout/NotesMainContent';
import { NotesMobileTopics } from '@/features/notes/components/layout/NotesMobileTopics';
import { QuizDrawer } from '@/features/quiz/components/layout/QuizDrawer';

/**
 * Notlar Sayfası
 * Kurs ve konu bazlı notları görüntüleme arayüzü
 */
export default function NotesPage() {
  const {
    loading,
    error,
    courseTitle,
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
    handleTopicSelect,
    handleSearchResultClick,
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

  if (error || !selectedTopic) {
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
      <div className="flex h-screen flex-col bg-background text-foreground lg:flex-row">
        {/* Sol Panel - Masaüstü */}
        <NotesLeftPanel
          topics={topics}
          selectedTopicId={selectedTopic.id}
          isLeftPanelOpen={isLeftPanelOpen}
          courseTitle={courseTitle}
          onTopicSelect={handleTopicSelect}
          onSearchResultClick={handleSearchResultClick}
          onTogglePanel={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
        />

        {/* Ana İçerik */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Mobil Menü Kontrolü */}
          <div className="flex items-center justify-between border-b p-4 lg:hidden">
            <div className="flex items-center gap-3">
              <Link to={ROUTES.HOME}>
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-lg font-bold truncate max-w-[200px]">
                {courseTitle}
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              Konular
            </Button>
          </div>

          {/* Konu Başlığı & Progress - Masaüstü */}
          <div className="hidden items-center justify-between border-b px-6 py-4 bg-card/50 backdrop-blur-md lg:flex">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
                className="hidden lg:flex"
              >
                {isLeftPanelOpen ? (
                  <ChevronLeft className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </Button>
              <div>
                <span className="text-sm font-medium text-foreground/80 truncate max-w-[150px]">
                  {selectedTopic?.section_title}
                </span>
                <p className="text-xs text-muted-foreground">
                  {courseTitle} • {topics.length} Konu
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ScoreTypeRadarModal
                open={false}
                onOpenChange={() => {}}
                data={{ p30: 0, p35: 0, p48: 0 }}
              />
              <QuizDrawer
                isOpen={false}
                onClose={() => {}}
                courseId=""
                courseSlug=""
                courseName=""
              />
            </div>
          </div>

          {/* İçerik Alanı */}
          <NotesMainContent
            content={content}
            activeTab={activeTab}
            selectedTopic={selectedTopic}
            courseTitle={courseTitle}
            mainContentRef={mainContentRef}
            setActiveTab={setActiveTab}
          />
        </div>

        {/* Mobil Konu Listesi Overlay */}
        <NotesMobileTopics
          topics={topics}
          selectedTopicId={selectedTopic.id}
          isMobileMenuOpen={isMobileMenuOpen}
          onTopicSelect={(topic) => {
            handleTopicSelect(topic);
            setIsMobileMenuOpen(false);
          }}
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
