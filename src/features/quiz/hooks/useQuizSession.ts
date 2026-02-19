import { useCallback } from 'react';
import {
  MultipleChoiceQuestion,
  QuizQuestion,
  QuizResponseType,
  QuizResults,
  QuizState,
  SessionContext,
  TrueFalseQuestion,
} from '../types';
import {
  fetchQuestionsByIds,
  getReviewQueue,
  startQuizSession,
  submitQuizAnswer,
} from '../services/quizService';
import { generateForChunk } from '../logic/quizParser';
import { MASTERY_THRESHOLD } from '../utils/constants';
import { useFeatureBridge } from '@/shared/hooks/useFeatureBridge';
import { updateResults } from '../logic/quizCoreLogic';

// ============================================================================
// Quiz Session Controls (formerly in useQuizSession.ts)
// ============================================================================

interface UseQuizSessionControlsProps {
  updateState: (patch: Partial<QuizState>) => void;
  loadQuestionsIntoState: (questions: QuizQuestion[]) => void;
  _resetTimer: () => void;
  setSessionContext: (context: SessionContext | null) => void;
}

export function useQuizSessionControls({
  updateState,
  loadQuestionsIntoState,
  _resetTimer,
  setSessionContext,
}: UseQuizSessionControlsProps) {
  const { setPomodoroSessionId } = useFeatureBridge();

  const startQuiz = useCallback(
    async (userId: string, courseId: string, chunkId?: string) => {
      updateState({ isLoading: true, error: null });
      try {
        const session = await startQuizSession(userId, courseId);
        setSessionContext(session);
        setPomodoroSessionId(session.sessionNumber.toString());

        const queue = await getReviewQueue(session, 10, chunkId);
        if (queue.length > 0) {
          const questions = await fetchQuestionsByIds(
            queue.map((i) => i.questionId)
          );
          loadQuestionsIntoState(
            questions.map((q) => {
              const qd = q.question_data as
                | TrueFalseQuestion
                | MultipleChoiceQuestion;
              return {
                ...qd,
                id: q.id,
              } as QuizQuestion;
            })
          );
        } else if (chunkId) {
          await generateForChunk(
            chunkId,
            {
              onLog: () => {},
              onTotalTargetCalculated: () => {},
              onQuestionSaved: (count: number) =>
                updateState({ generatedCount: count }),
              onComplete: async () => {
                const newQueue = await getReviewQueue(session, 10, chunkId);
                const newQs = await fetchQuestionsByIds(
                  newQueue.map((i) => i.questionId)
                );
                loadQuestionsIntoState(
                  newQs.map((q) => {
                    const qd = q.question_data as
                      | TrueFalseQuestion
                      | MultipleChoiceQuestion;
                    return {
                      ...qd,
                      id: q.id,
                    } as QuizQuestion;
                  })
                );
              },
              onError: (err: string) =>
                updateState({ error: err, isLoading: false }),
            },
            { usageType: 'antrenman', userId }
          );
        } else {
          updateState({
            isLoading: false,
            error: 'Soru bulunamadı.',
          });
        }
      } catch (e: unknown) {
        const error = e as Error;
        updateState({ isLoading: false, error: error.message });
      }
    },
    [
      updateState,
      loadQuestionsIntoState,
      setPomodoroSessionId,
      setSessionContext,
    ]
  );

  return { startQuiz };
}

// ============================================================================
// Quiz Submission Logic (formerly in useQuizSubmission.ts)
// ============================================================================

interface UseQuizSubmissionProps {
  currentQuestion: QuizQuestion | null;
  sessionContext: SessionContext | null;
  selectedAnswer: number | null;
  isAnswered: boolean;
  setResults: React.Dispatch<React.SetStateAction<QuizResults>>;
  updateState: (patch: Partial<QuizState>) => void;
  stopTimer: () => number;
}

export function useQuizSubmission({
  currentQuestion,
  sessionContext,
  selectedAnswer,
  isAnswered,
  setResults,
  updateState,
  stopTimer,
}: UseQuizSubmissionProps) {
  const { triggerCelebration, decrementQuizQuota } = useFeatureBridge();

  const submitAnswer = useCallback(
    async (type: QuizResponseType = 'correct') => {
      if (isAnswered || !currentQuestion || !sessionContext) {
        return;
      }

      const actualType =
        type === 'correct'
          ? selectedAnswer === currentQuestion.a
            ? 'correct'
            : 'incorrect'
          : type;

      const timeSpent = stopTimer();

      setResults((prev) =>
        updateResults(prev, actualType as QuizResponseType, timeSpent)
      );

      updateState({
        isAnswered: true,
        isCorrect: actualType === 'correct',
        showExplanation: actualType !== 'blank',
      });

      const result = await submitQuizAnswer(
        sessionContext,
        currentQuestion.id!,
        currentQuestion.chunk_id || null,
        actualType as QuizResponseType,
        timeSpent,
        selectedAnswer
      );

      updateState({ lastSubmissionResult: result });

      if (result.newMastery >= MASTERY_THRESHOLD && currentQuestion.chunk_id) {
        triggerCelebration({
          id: `MASTERY_${currentQuestion.chunk_id}_${result.newMastery}`,
          title: 'Uzmanlık Seviyesi!',
          description: `Bu konudaki ustalığın ${result.newMastery} puana ulaştı.`,
          variant: 'achievement',
        });
      }
      decrementQuizQuota();
    },
    [
      isAnswered,
      currentQuestion,
      sessionContext,
      selectedAnswer,
      stopTimer,
      setResults,
      updateState,
      triggerCelebration,
      decrementQuizQuota,
    ]
  );

  return { submitAnswer };
}
