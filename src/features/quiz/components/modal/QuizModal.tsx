import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Brain, ChevronRight, FileText } from 'lucide-react';
import { QuizEngine } from '../engine/QuizEngine';
import { QuizSessionProvider } from '../contexts/QuizSessionProvider';
import { ErrorBoundary } from '@/app/providers/ErrorBoundary';
import { useQuizManager, QuizState } from '../../hooks/useQuizManager';
import { TopicSidebar } from 'TopicSidebar';
import { InitialStateView } from 'InitialStateView';
import { MappingProgressView } from 'MappingProgressView';
import { BriefingView } from 'BriefingView';
import { SmartExamView } from 'SmartExamView';

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
  } = useQuizManager({ isOpen, courseId, courseName });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetState();
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Header */}
        <div className="flex flex-col h-full overflow-hidden">
          <DialogHeader className="p-6 border-b border-border/40 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Brain className="w-6 h-6" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-bold">
                  {courseName}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground flex items-center gap-2">
                  {isQuizActive ? (
                    <>
                      <span
                        className="cursor-pointer hover:text-foreground transition-colors"
                        onClick={handleBackToTopics}
                      >
                        Konu Listesi
                      </span>
                      <ChevronRight className="w-3 h-3" />
                      <span className="font-medium text-foreground">
                        {selectedTopic?.name}
                      </span>
                    </>
                  ) : (
                    'Konu Seçimi'
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden relative">
            {isQuizActive && selectedTopic ? (
              <div className="h-full overflow-y-auto p-6">
                <ErrorBoundary>
                  <QuizSessionProvider>
                    <QuizEngine
                      chunkId={targetChunkId || undefined}
                      courseId={courseId}
                      courseName={courseName}
                      sectionTitle={selectedTopic.name}
                      content={targetChunkId ? undefined : ' '} // Fallback if no chunk found
                      initialQuestions={existingQuestions}
                      onClose={handleBackToTopics} // Use handleBackTo refresh stats
                    />
                  </QuizSessionProvider>
                </ErrorBoundary>
              </div>
            ) : (
              <div className="grid md:grid-cols-[300px_1fr] h-full">
                {/* Left: Topic List */}
                <TopicSidebar
                  loading={loading}
                  topics={topics}
                  selectedTopic={selectedTopic}
                  onSelectTopic={setSelectedTopic}
                />
                {/* Right: Detail Panel */}
                <div className="bg-muted/5 flex flex-col h-full overflow-hidden">
                  {selectedTopic ? (
                    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in zoom-in-95 duration-200">
                      {/* Header: Icon + Title (Sabit kalsın) */}
                      <div className="flex items-center gap-3 px-6 py-4 text-left border-b border-border/10 shrink-0">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 text-primary">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold leading-tight text-foreground truncate">
                            {selectedTopic.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {quizState === QuizState.NOT_ANALYZED &&
                              'Henüz analiz edilmedi'}
                            {quizState === QuizState.MAPPING &&
                              'Analiz ediliyor...'}
                            {quizState === QuizState.BRIEFING &&
                              'Analiz tamamlandı, antrenman hazır.'}
                          </p>
                        </div>
                      </div>

                      {/* Scrollable Content Area */}
                      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col items-center justify-start bg-muted/5">
                        {/* max-w-none kullanarak içeriği tüm alana yayıyoruz */}
                        <div className="w-full max-w-none flex flex-col items-center justify-start transition-all duration-300 min-h-full">
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
                  ) : (
                    /* Zeki Deneme Görünümü */
                    <div className="flex-1 overflow-y-auto">
                      <SmartExamView
                        isGeneratingExam={isGeneratingExam}
                        examProgress={examProgress}
                        examLogs={examLogs}
                        onStartSmartExam={handleStartSmartExam}
                      />
                    </div>
                  )}
                </div>{' '}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
