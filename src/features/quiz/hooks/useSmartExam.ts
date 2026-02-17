import { useCallback } from "react";
import { ExamService } from "@/features/quiz/logic/engines/examEngine";
import * as Repository from "@/features/quiz/services/repositories/quizRepository";
import { type QuizQuestion } from "@/features/quiz/types";
import { QuizQuestionSchema } from "@/features/quiz/types";
import { parseOrThrow } from "@/utils/helpers";
import { logger } from "@/utils/logger";
import { AI_MODE } from "@/utils/aiConfig";
import { type GenerationLog } from "@/features/quiz/types";
import { MAX_LOG_ENTRIES } from "@/utils/constants";

/**
 * Helper to transform DB questions to QuizQuestion type
 */
function toQuizQuestions(
  questionsData: Pick<
    Repository.QuestionWithStatus["questions"],
    "id" | "question_data"
  >[],
): QuizQuestion[] {
  return questionsData.map((q) => ({
    ...parseOrThrow(QuizQuestionSchema, q.question_data),
    id: q.id,
  }));
}

export function useSmartExam(
  updateGeneration: (patch: {
    isGenerating?: boolean;
    logs?: GenerationLog[];
    progress?: { current: number; total: number };
  }) => void,
  setGeneration: (
    fn: (prev: {
      isGenerating: boolean;
      logs: GenerationLog[];
      progress: { current: number; total: number };
    }) => {
      isGenerating: boolean;
      logs: GenerationLog[];
      progress: { current: number; total: number };
    },
  ) => void,
) {
  const startExamFromPool = useCallback(
    async (userId: string, courseId: string) => {
      try {
        const poolResult = await ExamService.fetchSmartExamFromPool(
          courseId,
          userId,
        );

        if (poolResult && poolResult.questionIds.length >= 20) {
          const questionsData = await Repository.fetchQuestionsByIds(
            poolResult.questionIds,
          );
          if (questionsData) {
            return toQuizQuestions(questionsData);
          }
        }
      } catch (error) {
        logger.error("Error fetching exam from pool", error as Error);
      }
      return null;
    },
    [],
  );

  const generateAndFetchExam = useCallback(
    async (userId: string, courseId: string, courseName: string) => {
      const initialLogs: GenerationLog[] = [];
      if (AI_MODE === "TEST") {
        initialLogs.push({
          id: "ai-warning-" + Date.now(),
          message:
            "İçerik analiz ediliyor, bu işlem birkaç dakika sürebilir...",
          step: "INIT",
          details: {},
          timestamp: new Date(),
        });
      }

      updateGeneration({
        isGenerating: true,
        logs: initialLogs,
        progress: { current: 0, total: 0 },
      });

      try {
        const result = await ExamService.generateSmartExam(
          courseId,
          courseName,
          userId,
          {
            onLog: (log: GenerationLog) =>
              setGeneration((prev) => ({
                ...prev,
                logs: [log, ...prev.logs].slice(0, MAX_LOG_ENTRIES),
              })),
            onTotalTargetCalculated: (total: number) =>
              setGeneration((prev) => ({
                ...prev,
                progress: { ...prev.progress, total },
              })),
            onQuestionSaved: (count: number) =>
              setGeneration((prev) => ({
                ...prev,
                progress: { ...prev.progress, current: count },
              })),
            onComplete: () => {},
            onError: (err: string) =>
              logger.error("Exam generation error:", {
                message: err,
              }),
          },
        );

        if (result.success && result.questionIds.length > 0) {
          const questionsData = await Repository.fetchQuestionsByIds(
            result.questionIds,
          );
          if (questionsData) {
            return toQuizQuestions(questionsData);
          }
        }
      } catch (error) {
        logger.error("Failed to generate smart exam:", error as Error);
      } finally {
        updateGeneration({ isGenerating: false });
      }
      return null;
    },
    [updateGeneration, setGeneration],
  );

  return {
    startExamFromPool,
    generateAndFetchExam,
  };
}
