import { useCallback } from "react";
import { QuizResults, QuizState } from "@/features/quiz/types/quizTypes";
import { updateResults } from "@/features/quiz/logic/algorithms/scoring";
import { submitAnswer } from "@/features/quiz/logic/engines/submissionEngine";
import { useCelebrationStore } from "@/store/useCelebrationStore";
import { useQuotaStore } from "@/features/quiz/store";
import { MASTERY_THRESHOLD } from "@/utils/constants";

interface UseInteractionActionsProps {
  state: QuizState;
  updateState: (patch: Partial<QuizState>) => void;
  updateResults: (updater: (prev: QuizResults) => QuizResults) => void;
  timerRef: React.RefObject<{ stop: () => number } | undefined>;
  sessionContextRef: React.RefObject<
    {
      userId: string;
      courseId: string;
      courseName?: string;
      sessionNumber: number;
      isNewSession: boolean;
    } | null
  >;
  config?: {
    recordResponse?: (
      questionId: string,
      responseType: "correct" | "incorrect" | "blank",
      selectedAnswer: number | null,
      timeSpentMs: number,
      diagnosis?: string,
      insight?: string,
    ) => Promise<unknown>;
  };
}

export function useInteractionActions({
  state,
  updateState,
  updateResults: updateResultsState,
  timerRef,
  sessionContextRef,
  config,
}: UseInteractionActionsProps) {
  const selectAnswer = useCallback(
    (index: number) => {
      if (state.isAnswered || !state.currentQuestion) return;
      const newIndex = state.selectedAnswer === index ? null : index;
      updateState({ selectedAnswer: newIndex });
    },
    [
      state.isAnswered,
      state.currentQuestion,
      state.selectedAnswer,
      updateState,
    ],
  );

  const markAsBlank = useCallback(async () => {
    if (state.isAnswered || !state.currentQuestion) return;

    const timeSpent = timerRef.current?.stop();
    if (timeSpent === undefined) return;

    updateResultsState((prev) => updateResults(prev, "blank", timeSpent));

    updateState({
      selectedAnswer: null,
      isAnswered: true,
      isCorrect: false,
      showExplanation: false,
    });

    if (sessionContextRef.current && state.currentQuestion.id) {
      const result = await submitAnswer(
        sessionContextRef.current,
        state.currentQuestion.id,
        state.currentQuestion.chunk_id || null,
        "blank",
        timeSpent,
        null,
      );

      updateState({ lastSubmissionResult: result });
      useQuotaStore.getState().actions.decrementQuota();
    }

    if (config?.recordResponse && state.currentQuestion.id) {
      await config.recordResponse(
        state.currentQuestion.id,
        "blank",
        null,
        timeSpent,
        state.currentQuestion.diagnosis,
        state.currentQuestion.insight,
      );
    }
  }, [
    state.isAnswered,
    state.currentQuestion,
    timerRef,
    updateResultsState,
    updateState,
    sessionContextRef,
    config,
  ]);

  const confirmAnswer = useCallback(
    async (_userId: string, _courseId: string) => {
      if (state.isAnswered || !state.currentQuestion) return;

      const timeSpent = timerRef.current?.stop();
      if (timeSpent === undefined) return;

      const isCorrect = state.selectedAnswer === state.currentQuestion.a;
      const type = isCorrect ? "correct" : "incorrect";

      updateResultsState((prev) => updateResults(prev, type, timeSpent));

      updateState({
        isAnswered: true,
        isCorrect,
        showExplanation: true,
      });

      if (sessionContextRef.current && state.currentQuestion.id) {
        const result = await submitAnswer(
          sessionContextRef.current,
          state.currentQuestion.id,
          state.currentQuestion.chunk_id || null,
          type,
          timeSpent,
          state.selectedAnswer,
        );

        updateState({ lastSubmissionResult: result });

        if (result.newMastery >= MASTERY_THRESHOLD) {
          useCelebrationStore.getState().actions.enqueueCelebration({
            id:
              `MASTERY_${state.currentQuestion.chunk_id}_${result.newMastery}`,
            title: "Uzmanlık Seviyesi!",
            description:
              `Bu konudaki ustalığın ${result.newMastery} puana ulaştı.`,
            variant: "achievement",
          });
        }

        useQuotaStore.getState().actions.decrementQuota();
      }

      if (config?.recordResponse && state.currentQuestion.id) {
        await config.recordResponse(
          state.currentQuestion.id,
          type,
          state.selectedAnswer,
          timeSpent,
          state.currentQuestion.diagnosis,
          state.currentQuestion.insight,
        );
      }
    },
    [
      state.isAnswered,
      state.currentQuestion,
      state.selectedAnswer,
      timerRef,
      updateResultsState,
      updateState,
      sessionContextRef,
      config,
    ],
  );

  return { selectAnswer, markAsBlank, confirmAnswer };
}
