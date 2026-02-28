import { useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useQuizEngine } from '@/features/quiz/hooks/useQuizEngine';
import { QuizView } from './QuizView';

interface QuizContainerProps {
  chunkId?: string;
  courseId?: string;
  onClose?: () => void;
}

export function QuizContainer({
  chunkId,
  courseId,
  onClose,
}: QuizContainerProps) {
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

  useEffect(() => {
    if (user?.id && courseId) {
      startQuiz(user.id, courseId, chunkId);
    }
  }, [user?.id, courseId, chunkId, startQuiz]);

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
