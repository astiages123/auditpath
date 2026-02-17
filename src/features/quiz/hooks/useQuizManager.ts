import { useCallback, useMemo, useState } from "react";
import { getTopicCompletionStatus } from "@/features/quiz/services/core/quizStatusService";
import { QuizFactory } from "@/features/quiz/logic/factory/QuizFactory";
import { type QuizQuestion } from "@/features/quiz/types";
import { logger } from "@/utils/logger";
import { AI_MODE } from "@/utils/aiConfig";
import { useQuizTopics } from "./useQuizTopics";
import {
  INITIAL_GENERATION_STATE,
  useQuizGeneration,
} from "./useQuizGeneration";
import { useSmartExam } from "./useSmartExam";

export enum QuizState {
  NOT_ANALYZED = "NOT_ANALYZED",
  MAPPING = "MAPPING",
  BRIEFING = "BRIEFING",
  ACTIVE = "ACTIVE",
}

interface UseQuizManagerProps {
  isOpen: boolean;
  courseId: string;
  courseName: string;
}

export function useQuizManager({
  isOpen,
  courseId,
  courseName,
}: UseQuizManagerProps) {
  const {
    user,
    topics,
    selectedTopic,
    setSelectedTopic,
    targetChunkId,
    loading,
    completionStatus,
    setCompletionStatus,
    courseProgress,
    loadTopics,
  } = useQuizTopics(courseId, isOpen);
  const {
    generation,
    setGeneration,
    updateGeneration,
    stopGeneration,
    startGeneration,
  } = useQuizGeneration();
  const { startExamFromPool, generateAndFetchExam } = useSmartExam(
    updateGeneration,
    setGeneration,
  );

  const [existingQuestions, setExistingQuestions] = useState<QuizQuestion[]>(
    [],
  );
  const [isQuizActive, setIsQuizActive] = useState(false);

  // --- Derived State ---
  const quizState = useMemo(() => {
    if (isQuizActive) return QuizState.ACTIVE;
    if (generation.isGenerating) return QuizState.MAPPING;
    if (
      completionStatus?.aiLogic &&
      completionStatus?.concepts &&
      completionStatus.concepts.length > 0
    ) {
      return QuizState.BRIEFING;
    }
    return QuizState.NOT_ANALYZED;
  }, [isQuizActive, generation.isGenerating, completionStatus]);

  // --- Handlers ---
  const handleGenerate = useCallback(
    async (mappingOnly: boolean = true) => {
      if (!targetChunkId) return;

      const initialLogs = AI_MODE === "TEST"
        ? [
          {
            id: "ai-warning-" + Date.now(),
            message:
              "İçerik analiz ediliyor, bu işlem birkaç dakika sürebilir...",
            step: "INIT" as const,
            details: {},
            timestamp: new Date(),
          },
        ]
        : [];

      startGeneration(initialLogs);

      try {
        const factory = new QuizFactory();
        await factory.generateForChunk(
          targetChunkId,
          {
            onLog: (log) =>
              setGeneration((prev) => ({
                ...prev,
                logs: [log, ...prev.logs].slice(0, 10),
              })),
            onTotalTargetCalculated: (total) =>
              setGeneration((prev) => ({
                ...prev,
                progress: { ...prev.progress, total },
              })),
            onQuestionSaved: (count) =>
              setGeneration((prev) => ({
                ...prev,
                progress: { ...prev.progress, current: count },
              })),
            onComplete: async () => {
              if (selectedTopic && user) {
                const newStatus = await getTopicCompletionStatus(
                  user.id,
                  courseId,
                  selectedTopic.name,
                );
                setCompletionStatus(newStatus);
              }
              stopGeneration();
            },
            onError: (err) => {
              logger.error("Generation error:", { message: err });
              stopGeneration();
            },
          },
          { mappingOnly },
        );
      } catch (error) {
        logger.error("Failed to generate:", error as Error);
        stopGeneration();
      }
    },
    [
      targetChunkId,
      user,
      selectedTopic,
      courseId,
      startGeneration,
      stopGeneration,
      setGeneration,
      setCompletionStatus,
    ],
  );

  const handleStartQuiz = useCallback(() => {
    if (
      completionStatus &&
      completionStatus.antrenman.existing < completionStatus.antrenman.quota
    ) {
      handleGenerate(false);
      return;
    }
    setExistingQuestions([]);
    setIsQuizActive(true);
  }, [completionStatus, handleGenerate]);

  const handleBackToTopics = useCallback(() => {
    setSelectedTopic(null);
    setIsQuizActive(false);
    setGeneration(INITIAL_GENERATION_STATE);
    setExistingQuestions([]);
    loadTopics();
  }, [setSelectedTopic, setGeneration, loadTopics]);

  const handleStartSmartExam = useCallback(async () => {
    if (!user || !courseId || !courseName) return;

    const pooledQuestions = await startExamFromPool(user.id, courseId);
    if (pooledQuestions) {
      setExistingQuestions(pooledQuestions);
      setSelectedTopic({
        name: "Karma Deneme Sınavı",
        isCompleted: false,
        counts: {
          antrenman: 0,
          arsiv: 0,
          deneme: pooledQuestions.length,
          total: pooledQuestions.length,
        },
      });
      setIsQuizActive(true);
      return;
    }

    const generatedQuestions = await generateAndFetchExam(
      user.id,
      courseId,
      courseName,
    );
    if (generatedQuestions) {
      setExistingQuestions(generatedQuestions);
      setSelectedTopic({
        name: "Karma Deneme Sınavı",
        isCompleted: false,
        counts: {
          antrenman: 0,
          arsiv: 0,
          deneme: generatedQuestions.length,
          total: generatedQuestions.length,
        },
      });
      setIsQuizActive(true);
    }
  }, [
    user,
    courseId,
    courseName,
    startExamFromPool,
    generateAndFetchExam,
    setSelectedTopic,
  ]);

  const resetState = useCallback(() => {
    setSelectedTopic(null);
    setIsQuizActive(false);
    setExistingQuestions([]);
  }, [setSelectedTopic]);

  return {
    user,
    topics,
    selectedTopic,
    setSelectedTopic,
    targetChunkId,
    loading,
    completionStatus,
    existingQuestions,
    isQuizActive,
    isGeneratingExam: generation.isGenerating,
    quizState,
    examLogs: generation.logs,
    examProgress: generation.progress,
    handleStartQuiz,
    handleGenerate,
    handleBackToTopics,
    handleStartSmartExam,
    resetState,
    courseProgress,
  };
}
