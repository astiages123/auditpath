'use client';

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
import { useQuizManager, QuizState } from '../modal/hooks/useQuizManager';
import { TopicSidebar } from '../modal/parts/TopicSidebar';
import { InitialStateView } from '../modal/parts/InitialStateView';
import { MappingProgressView } from '../modal/parts/MappingProgressView';
import { BriefingView } from '../modal/parts/BriefingView';
import { SmartExamView } from '../modal/parts/SmartExamView';

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
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
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
              </div>
            ) : (
              <div className="grid md:grid-cols-[400px_1fr] h-full">
                {/* Left: Topic List */}
                <TopicSidebar
                  loading={loading}
                  topics={topics}
                  selectedTopic={selectedTopic}
                  onSelectTopic={setSelectedTopic}
                />

                {/* Right: Detail Panel */}
                <div className="bg-muted/5 p-4 flex flex-col items-center justify-center h-full text-center">
                  {selectedTopic ? (
                    <div className="max-w-4xl w-full h-full flex flex-col animate-in fade-in zoom-in-95 duration-200">
                      {/* Header: Icon + Title */}
                      <div className="flex items-center gap-3 px-4 text-left border-b border-border/10 pb-4 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 text-primary">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold leading-tight text-foreground">
                            {selectedTopic.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {quizState === QuizState.NOT_ANALYZED &&
                              'Henüz analiz edilmedi'}
                            {quizState === QuizState.MAPPING &&
                              'Analiz ediliyor...'}
                            {quizState === QuizState.BRIEFING &&
                              'Analiz tamamlandı, antrenman hazır.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col items-center justify-center space-y-8 p-6">
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
                  ) : (
                    <SmartExamView
                      isGeneratingExam={isGeneratingExam}
                      examProgress={examProgress}
                      examLogs={examLogs}
                      onStartSmartExam={handleStartSmartExam}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
