import { BookOpen, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopicSidebar } from '@/features/quiz/components/layout/QuizSideComponents';
import { PageContainer } from '@/components/layout/PageContainer';
import { SplitLayoutSkeleton } from '@/shared/components/SkeletonTemplates';
import { cn } from '@/utils/stringHelpers';
import { QuizFlowPanel } from '@/features/quiz/components/layout/QuizFlowPanel';
import { useQuizPageLogic } from '@/features/quiz/hooks/useQuizPageLogic';

export function QuizPageContent() {
  const {
    courseData,
    isResolvingCourse,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    handleTopicSelect,
    handleBack,
    handleMobileTopicSelect,
    handleMobileSmartExamStart,
    navigateToLibrary,
    quizPhaseOptions,
    topics,
    selectedTopic,
    chunkId,
    loading,
    completionStatus,
    isQuizActive,
    isGeneratingExam,
    quizPhase,
    examLogs,
    examProgress,
    handleStartQuiz,
    handleGenerate,
    handleStopGeneration,
    handleStartSmartExam,
    courseProgress,
  } = useQuizPageLogic();

  return (
    <PageContainer
      isLoading={isResolvingCourse}
      loadingFallback={<SplitLayoutSkeleton />}
      isEmpty={!courseData}
      emptyFallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-muted-foreground">Kurs bulunamadı.</p>
          <Button onClick={navigateToLibrary}>Çalışma Merkezi'ne Dön</Button>
        </div>
      }
    >
      <div className="flex flex-col h-[calc(100vh-96px)] lg:h-[calc(100vh-128px)] overflow-hidden">
        <div
          className={cn(
            'flex-1 min-h-0 flex px-2 lg:px-4 h-full overflow-hidden',
            isQuizActive
              ? 'flex flex-col'
              : 'grid lg:grid-cols-[240px_1fr] gap-4'
          )}
        >
          {!isQuizActive && (
            <aside className="hidden lg:flex flex-col shrink-0 border rounded-xl bg-card h-full overflow-hidden transition-all duration-300 ease-in-out z-20">
              <div className="min-w-[240px] h-full flex flex-col">
                <TopicSidebar
                  loading={loading}
                  topics={topics}
                  selectedTopic={selectedTopic}
                  onSelectTopic={handleTopicSelect}
                  onStartSmartExam={handleStartSmartExam}
                  isGeneratingExam={isGeneratingExam}
                />
              </div>
            </aside>
          )}

          <div className="flex flex-col min-h-0 flex-1 bg-card rounded-xl border overflow-hidden h-full">
            <div className="flex flex-col flex-1 min-h-0">
              <div
                id="notes-sticky-header"
                className="group flex flex-col border-b border-border/10 shrink-0 bg-card/80 backdrop-blur-md z-10 transition-all duration-300"
              >
                <div className="flex items-center gap-3 px-6 py-4">
                  <button
                    className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent transition-colors"
                    onClick={() => setIsMobileSidebarOpen(true)}
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                  <div className="w-8 h-8 bg-primary/10 rounded-lg hidden lg:flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground truncate">
                      {selectedTopic ? selectedTopic.name : courseData?.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                      Sınav Merkezi
                    </p>
                  </div>
                </div>
              </div>

              <div
                id="notes-scroll-container"
                className="flex-1 min-h-0 p-4 lg:p-6 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar mx-auto w-full"
              >
                <div className="w-full flex-1 flex flex-col min-h-0 mx-auto transition-all duration-300 max-w-6xl">
                  <QuizFlowPanel
                    quizPhase={quizPhase}
                    quizPhaseOptions={quizPhaseOptions}
                    selectedTopic={selectedTopic}
                    isQuizActive={isQuizActive}
                    chunkId={chunkId}
                    courseId={courseData?.id || ''}
                    courseName={courseData?.name || ''}
                    courseProgress={courseProgress}
                    isGeneratingExam={isGeneratingExam}
                    examProgress={examProgress}
                    examLogs={examLogs}
                    completionStatus={completionStatus}
                    onBack={handleBack}
                    onGenerate={handleGenerate}
                    onStopGeneration={handleStopGeneration}
                    onStartQuiz={handleStartQuiz}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-background animate-in slide-in-from-left duration-200">
          <div className="flex items-center justify-between px-4 py-4 border-b border-border/20">
            <span className="text-base font-bold">Konular</span>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <TopicSidebar
              loading={loading}
              topics={topics}
              selectedTopic={selectedTopic}
              onSelectTopic={handleMobileTopicSelect}
              onStartSmartExam={handleMobileSmartExamStart}
              isGeneratingExam={isGeneratingExam}
            />
          </div>
        </div>
      )}
    </PageContainer>
  );
}
