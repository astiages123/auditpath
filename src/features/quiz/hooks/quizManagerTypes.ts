import { type GenerationLog, type QuizQuestion } from '@/features/quiz/types';
import {
  TopicCompletionStats,
  TopicWithCounts,
} from '@/features/courses/types/courseTypes';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const QUIZ_PHASE = {
  NOT_ANALYZED: 'NOT_ANALYZED',
  MAPPING: 'MAPPING',
  BRIEFING: 'BRIEFING',
  ACTIVE: 'ACTIVE',
} as const;

export type QuizPhase = (typeof QUIZ_PHASE)[keyof typeof QUIZ_PHASE];

export interface QuizManagerGenerationState {
  isGenerating: boolean;
  logs: GenerationLog[];
  progress: { current: number; total: number };
}

export interface UseQuizManagerProps {
  isOpen: boolean;
  courseId: string;
  courseName: string;
}

export interface UseQuizManagerReturn {
  user: ReturnType<typeof useAuth>['user'];
  topics: TopicWithCounts[];
  selectedTopic: TopicWithCounts | null;
  setSelectedTopic: (topic: TopicWithCounts | null) => void;
  chunkId: string | null;
  loading: boolean;
  completionStatus: TopicCompletionStats | null;
  existingQuestions: QuizQuestion[];
  isQuizActive: boolean;
  isGeneratingExam: boolean;
  quizPhase: QuizPhase;
  examLogs: GenerationLog[];
  examProgress: QuizManagerGenerationState['progress'];
  courseProgress: { total: number; solved: number; percentage: number } | null;
  handleStartQuiz: () => void;
  handleGenerate: () => Promise<void>;
  handleStopGeneration: () => void;
  handleBackToTopics: () => void;
  handleFinishQuiz: () => Promise<void>;
  handleStartSmartExam: () => Promise<void>;
  resetState: () => void;
}
