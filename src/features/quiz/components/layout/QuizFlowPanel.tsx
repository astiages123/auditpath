import { ErrorBoundary } from '@/components/ui/error-boundary';
import { InitialStateView, CourseOverview } from '../views/QuizIntroViews';
import { MappingProgressView } from '../views/MappingProgressView';
import { BriefingView } from '../views/BriefingView';
import { SmartExamView } from '../views/SmartExamView';
import { QuizContainer } from './QuizContainer';

import { type GenerationLog } from '@/features/quiz/types';
import {
  TopicCompletionStats,
  TopicWithCounts,
} from '@/features/courses/types/courseTypes';

interface QuizFlowPanelProps {
  quizPhase: string;
  quizPhaseOptions: Record<string, string>;
  selectedTopic: TopicWithCounts | null;
  isQuizActive: boolean;
  chunkId: string | null;
  courseId: string;
  courseName: string;
  courseProgress: { total: number; solved: number; percentage: number } | null;
  isGeneratingExam?: boolean;
  examProgress: { current: number; total: number };
  examLogs: GenerationLog[];
  completionStatus: TopicCompletionStats | null;
  onBack: () => void;
  onGenerate: () => void;
  onStopGeneration: () => void;
  onStartQuiz: () => void;
}

/**
 * Quiz akışının (analiz, hazırlık ve uygulama) merkezi yönetim paneli.
 * QuizPageContent ve QuizDrawer arasındaki kod tekrarını önler.
 */
export function QuizFlowPanel({
  quizPhase,
  quizPhaseOptions,
  selectedTopic,
  isQuizActive,
  chunkId,
  courseId,
  courseName,
  courseProgress,
  isGeneratingExam = false,
  examProgress,
  examLogs,
  completionStatus,
  onBack,
  onGenerate,
  onStopGeneration,
  onStartQuiz,
}: QuizFlowPanelProps) {
  if (isQuizActive && selectedTopic) {
    return (
      <QuizContainer
        chunkId={chunkId || undefined}
        courseId={courseId}
        onClose={onBack}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex-1 flex flex-col min-h-0">
        {selectedTopic ? (
          <div className="flex-1 flex flex-col min-h-0">
            {quizPhase === quizPhaseOptions.NOT_ANALYZED && (
              <InitialStateView onGenerate={onGenerate} />
            )}

            {quizPhase === quizPhaseOptions.MAPPING && (
              <MappingProgressView
                examProgress={examProgress}
                examLogs={examLogs}
                onCancel={onStopGeneration}
              />
            )}

            {quizPhase === quizPhaseOptions.BRIEFING && completionStatus && (
              <BriefingView
                completionStatus={completionStatus}
                onStartQuiz={onStartQuiz}
              />
            )}
          </div>
        ) : isGeneratingExam ? (
          <div className="flex-1 flex items-center justify-center">
            <SmartExamView examProgress={examProgress} examLogs={examLogs} />
          </div>
        ) : (
          <CourseOverview courseName={courseName} progress={courseProgress} />
        )}
      </div>
    </ErrorBoundary>
  );
}
