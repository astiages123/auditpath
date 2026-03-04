import { useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useQuizEngine } from '@/features/quiz/hooks/useQuizEngine';
import { QuizView } from '@/features/quiz/components/views/QuizView';

// === TYPES ===

interface QuizContainerProps {
  /** Note chunk ID (opsiyonel, konu bazlı quiz için) */
  chunkId?: string;
  /** Kurs ID (zorunlu) */
  courseId?: string;
  /** Kapatma callback'i */
  onClose?: () => void;
}

/**
 * Quiz sürecini başlatan ve yöneten ana kapsayıcı bileşen.
 * useQuizEngine hook'u ile iş mantığını koordine eder.
 */
export function QuizContainer({
  chunkId,
  courseId,
  onClose,
}: QuizContainerProps) {
  // === HOOKS ===
  const { user } = useAuth();
  const {
    state,
    progressIndex,
    startQuiz,
    selectAnswer,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    toggleExplanation,
  } = useQuizEngine(courseId || '');

  // === SIDE EFFECTS ===
  useEffect(() => {
    if (user?.id && courseId) {
      startQuiz(user.id, courseId, chunkId);
    }
  }, [user?.id, courseId, chunkId, startQuiz]);

  // === RENDER ===
  return (
    <QuizView
      state={state}
      progressIndex={progressIndex}
      onConfirm={() => submitAnswer('correct')}
      onBlank={() => submitAnswer('blank')}
      onNext={nextQuestion}
      onPrev={previousQuestion}
      onSelect={selectAnswer}
      onToggleExplanation={toggleExplanation}
      onRetry={() =>
        user?.id && courseId && startQuiz(user.id, courseId, chunkId)
      }
      onClose={onClose || (() => {})}
    />
  );
}
