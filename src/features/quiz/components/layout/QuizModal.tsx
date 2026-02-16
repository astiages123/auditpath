import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Brain, ChevronRight, FileText, Sparkles } from 'lucide-react';
import { QuizView } from '../execution/QuizView';
import { QuizSessionProvider } from '@/features/quiz/context/quizSessionProvider';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import {
  useQuizManager,
  QuizState,
} from '@/features/quiz/hooks/useQuizManager';
import { TopicSidebar } from './TopicSidebar';
import { InitialStateView } from '../generation/InitialStateView';
import { MappingProgressView } from '../generation/MappingProgressView';
import { BriefingView } from '../generation/BriefingView';
import { SmartExamView } from '../outcomes/SmartExamView';
import { CourseOverview } from './CourseOverview';
import { Button } from '@/components/ui/button';

interface QuizModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
}

export function QuizModal({
  isOpen,
  onOpenChange,
  courseId,
  courseName,
}: QuizModalProps) {
  const {
    topics,
    selectedTopic,
    setSelectedTopic,
    targetChunkId,
    loading,
    completionStatus,
    existingQuestions,
    isQuizActive,
    isGeneratingExam,
    quizState,
    examLogs,
    examProgress,
    handleStartQuiz,
    handleGenerate,
    handleBackToTopics,
    handleStartSmartExam,
    resetState,
    courseProgress,
  } = useQuizManager({ isOpen, courseId, courseName });

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {/* 1. h-[85vh] ile modal yüksekliğini sabitliyoruz.
          2. overflow-hidden ile modalın dışına taşmayı ve modalın kendisinin scroll olmasını engelliyoruz.
      */}
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border-border/50 shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border/30 bg-muted/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold leading-tight">
                  {courseName}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  {isQuizActive ? (
                    <>
                      <button
                        onClick={handleBackToTopics}
                        className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
                      >
                        Konular
                      </button>
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-foreground font-medium">
                        {selectedTopic?.name}
                      </span>
                    </>
                  ) : (
                    'Bir konu seçerek başla'
                  )}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DialogTitle className="sr-only">Kapat</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Gövde Katmanı: flex-1 ve min-h-0. 
            Burada min-h-0 olmazsa içindeki grid modalı aşağı doğru genişletmeye devam eder.
        */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {isQuizActive && selectedTopic ? (
            <div className="h-full">
              <ErrorBoundary>
                <QuizSessionProvider>
                  <QuizView
                    chunkId={targetChunkId || undefined}
                    courseId={courseId}
                    courseName={courseName}
                    sectionTitle={selectedTopic.name}
                    content={targetChunkId ? undefined : ' '}
                    initialQuestions={existingQuestions}
                    onClose={handleBackToTopics}
                  />
                </QuizSessionProvider>
              </ErrorBoundary>
            </div>
          ) : (
            <div className="grid md:grid-cols-[300px_1fr] h-full min-h-0">
              <TopicSidebar
                loading={loading}
                topics={topics}
                selectedTopic={selectedTopic}
                onSelectTopic={setSelectedTopic}
                onStartSmartExam={handleStartSmartExam}
                isGeneratingExam={isGeneratingExam}
              />

              {/* Sağ panel: min-h-0 ile içindeki elemanın (BriefingView) modalı aşmasını engelliyoruz */}
              <div className="flex flex-col h-full overflow-hidden bg-muted/5 min-h-0">
                {selectedTopic ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-border/10 shrink-0">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-foreground truncate">
                          {selectedTopic.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {quizState === QuizState.NOT_ANALYZED &&
                            'Henüz analiz edilmedi'}
                          {quizState === QuizState.MAPPING &&
                            'Analiz ediliyor...'}
                          {quizState === QuizState.BRIEFING && 'Hazır'}
                        </p>
                      </div>
                    </div>

                    {/* ASIL ÇÖZÜM: flex-1 overflow-hidden min-h-0 flex flex-col
                        Bu alan artık dışarı taşamaz. BriefingView burayı doldurur.
                    */}
                    <div className="flex-1 overflow-hidden p-6 min-h-0 flex flex-col">
                      <div className="max-w-5xl mx-auto w-full h-full flex flex-col min-h-0">
                        {quizState === QuizState.NOT_ANALYZED && (
                          <InitialStateView onGenerate={handleGenerate} />
                        )}

                        {quizState === QuizState.MAPPING && (
                          <MappingProgressView
                            examProgress={examProgress}
                            examLogs={examLogs}
                          />
                        )}

                        {quizState === QuizState.BRIEFING &&
                          completionStatus && (
                            <BriefingView
                              completionStatus={completionStatus}
                              onStartQuiz={handleStartQuiz}
                            />
                          )}
                      </div>
                    </div>
                  </div>
                ) : isGeneratingExam ? (
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <SmartExamView
                      examProgress={examProgress}
                      examLogs={examLogs}
                    />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <CourseOverview
                      courseName={courseName}
                      progress={courseProgress}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
