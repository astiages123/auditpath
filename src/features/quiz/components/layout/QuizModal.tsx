import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Brain, FileText } from 'lucide-react';
import { QuizView } from '../execution/QuizView';
import { QuizSessionProvider } from '@/features/quiz/hooks/context/QuizSessionProvider';
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

  const [isMockMode, setIsMockMode] = useState(false);

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState();
      setIsMockMode(false);
    }
    onOpenChange(open);
  };

  const startMockQuiz = () => {
    setIsMockMode(true);
    handleStartQuiz();
  };

  const handleBack = () => {
    setIsMockMode(false);
    handleBackToTopics();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {/* 1. h-[85vh] ile modal yüksekliğini sabitliyoruz.
          2. overflow-hidden ile modalın dışına taşmayı ve modalın kendisinin scroll olmasını engelliyoruz.
      */}
      <DialogContent className="max-w-[95vw] h-[95vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border-border/50 shadow-2xl">
        <DialogHeader
          className={`px-6 border-b transition-all duration-300 bg-muted/5 shrink-0 ${isQuizActive ? 'py-2.5 opacity-80' : 'py-5'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`transition-all duration-300 bg-primary/10 text-primary rounded-lg flex items-center justify-center ${isQuizActive ? 'w-7 h-7' : 'w-10 h-10'}`}
              >
                <Brain className={isQuizActive ? 'w-4 h-4' : 'w-6 h-6'} />
              </div>
              <div>
                <DialogTitle
                  className={`font-bold tracking-tight transition-all duration-300 ${isQuizActive ? 'text-sm' : 'text-xl'}`}
                >
                  {courseName}
                </DialogTitle>
                <DialogDescription className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5 uppercase tracking-widest font-semibold">
                  {isQuizActive ? (
                    <>
                      <button
                        onClick={handleBack}
                        className="hover:text-primary transition-colors"
                      >
                        Konular
                      </button>
                      <span className="opacity-20">/</span>
                      <span className="text-foreground/60">
                        {selectedTopic?.name ||
                          (isMockMode ? 'Mock Sorular' : '')}
                      </span>
                    </>
                  ) : (
                    'Konu Seçimi'
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
          {isQuizActive && (selectedTopic || isMockMode) ? (
            <div className="h-full">
              <ErrorBoundary>
                <QuizSessionProvider>
                  <QuizView
                    chunkId={targetChunkId || undefined}
                    courseId={courseId}
                    courseName={courseName}
                    sectionTitle={selectedTopic?.name || 'Mock Sorular'}
                    content={targetChunkId ? undefined : ' '}
                    initialQuestions={isMockMode ? [] : existingQuestions}
                    onClose={handleBack}
                    useMock={isMockMode}
                  />
                </QuizSessionProvider>
              </ErrorBoundary>
            </div>
          ) : (
            <div className="grid md:grid-cols-[280px_1fr] h-full min-h-0">
              <TopicSidebar
                loading={loading}
                topics={topics}
                selectedTopic={selectedTopic}
                onSelectTopic={setSelectedTopic}
                onStartSmartExam={handleStartSmartExam}
                onStartMockQuiz={startMockQuiz}
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
                      <div className="max-w-7xl mx-auto w-full h-full flex flex-col min-h-0">
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
