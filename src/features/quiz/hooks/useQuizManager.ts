import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  getCourseProgress,
  getCourseTopicsWithCounts,
  getFirstChunkIdForTopic,
  getTopicCompletionStatus,
} from "@/lib/clientDb";
import { TopicCompletionStats, TopicWithCounts } from "@/types";
import { ExamService } from "@/features/quiz/logic";
import { type QuizQuestion } from "@/features/quiz/types";
import * as Repository from "@/features/quiz/services/repositories/quizRepository";
import { type GenerationLog, QuizFactory } from "@/features/quiz/logic";
import { parseOrThrow } from "@/utils/helpers";
import { QuizQuestionSchema } from "@/features/quiz/types";
import { logger } from "@/utils/logger";
import { MAX_LOG_ENTRIES } from "@/utils/constants";
import { AI_MODE } from "@/utils/aiConfig";

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

interface GenerationState {
  isGenerating: boolean;
  logs: GenerationLog[];
  progress: { current: number; total: number };
}

const INITIAL_GENERATION_STATE: GenerationState = {
  isGenerating: false,
  logs: [],
  progress: { current: 0, total: 0 },
};

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

export function useQuizManager({
  isOpen,
  courseId,
  courseName,
}: UseQuizManagerProps) {
  const { user } = useAuth();

  // Topic & Course Data State
  const [topics, setTopics] = useState<TopicWithCounts[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicWithCounts | null>(
    null,
  );
  const [targetChunkId, setTargetChunkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completionStatus, setCompletionStatus] = useState<
    TopicCompletionStats | null
  >(null);
  const [courseProgress, setCourseProgress] = useState<
    {
      total: number;
      solved: number;
      percentage: number;
    } | null
  >(null);

  // Quiz Execution State
  const [existingQuestions, setExistingQuestions] = useState<QuizQuestion[]>(
    [],
  );
  const [isQuizActive, setIsQuizActive] = useState(false);

  // Generation State (Consolidated)
  const [generation, setGeneration] = useState<GenerationState>(
    INITIAL_GENERATION_STATE,
  );

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

  // --- Side Effects ---

  // 1. Load Topics
  useEffect(() => {
    let mounted = true;
    if (isOpen && courseId) {
      setLoading(true);
      getCourseTopicsWithCounts(courseId)
        .then((data) => {
          if (mounted) setTopics(data);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });

      if (user) {
        getCourseProgress(user.id, courseId).then(
          (
            data: { total: number; solved: number; percentage: number } | null,
          ) => {
            if (mounted) setCourseProgress(data);
          },
        );
      }
    }
    return () => {
      mounted = false;
    };
  }, [isOpen, courseId]);

  // 2. Load Topic Details
  useEffect(() => {
    let mounted = true;
    if (!selectedTopic || !courseId || !user) {
      setTargetChunkId(null);
      setCompletionStatus(null);
      return;
    }

    async function loadTopicData() {
      if (!selectedTopic || !courseId || !user) return; // double check for TS
      try {
        const chunkRes = await getFirstChunkIdForTopic(
          courseId,
          selectedTopic.name,
        );

        const [status] = await Promise.all([
          // Note: getTopicQuestionCount is not actually used in the original code's state?
          // keeping it aligned with original logic which called it but maybe didn't use it directly here
          // except for logging or side effects. The original setCompletionStatus used result[1].
          // Ref: getTopicCompletionStatus(user.id, courseId, selectedTopic.name)
          getTopicCompletionStatus(user.id, courseId, selectedTopic.name),
        ]);

        if (mounted) {
          setTargetChunkId(chunkRes);
          setCompletionStatus(status);
        }
      } catch (error) {
        logger.error("Error loading topic data", error as Error);
      }
    }

    loadTopicData();
    return () => {
      mounted = false;
    };
  }, [selectedTopic, courseId, user]);

  // --- Handlers ---

  const updateGeneration = useCallback((patch: Partial<GenerationState>) => {
    setGeneration((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleGenerate = useCallback(async (mappingOnly: boolean = true) => {
    if (!targetChunkId || !user) return;

    const initialLogs: GenerationLog[] = [];
    if (AI_MODE === "TEST") {
      initialLogs.push({
        id: "ai-warning-" + Date.now(),
        message: "İçerik analiz ediliyor, bu işlem birkaç dakika sürebilir...",
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
      const factory = new QuizFactory();
      await factory.generateForChunk(
        targetChunkId,
        {
          onLog: (log: GenerationLog) => {
            setGeneration((prev) => ({
              ...prev,
              logs: [log, ...prev.logs].slice(0, MAX_LOG_ENTRIES),
            }));
          },
          onTotalTargetCalculated: (total: number) => {
            setGeneration((prev) => ({
              ...prev,
              progress: { ...prev.progress, total },
            }));
          },
          onQuestionSaved: (count: number) => {
            setGeneration((prev) => ({
              ...prev,
              progress: { ...prev.progress, current: count },
            }));
          },
          onComplete: async (result) => {
            if (selectedTopic && courseId) {
              const newStatus = await getTopicCompletionStatus(
                user.id,
                courseId,
                selectedTopic.name,
              );
              setCompletionStatus(newStatus);
            }
            updateGeneration({ isGenerating: false });
          },
          onError: (err: string) => {
            logger.error("Generation error:", { message: err });
            updateGeneration({ isGenerating: false });
          },
        },
        { mappingOnly },
      );
    } catch (error) {
      logger.error("Failed to generate:", error as Error);
      updateGeneration({ isGenerating: false });
    }
  }, [targetChunkId, user, selectedTopic, courseId, updateGeneration]);

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

    // Optimistic or fresh reload of topics
    if (courseId && user) {
      getCourseTopicsWithCounts(courseId).then(setTopics);
      getCourseProgress(user.id, courseId).then((
        data: { total: number; solved: number; percentage: number } | null,
      ) => setCourseProgress(data));
    }
  }, [courseId]);

  // --- Start Smart Exam Helpers ---

  const startExamFromPool = async (userId: string, courseId: string) => {
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
    return null;
  };

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

      // Prepare generation state
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
            onComplete: (result) => {},
            onError: (err: string) =>
              logger.error("Exam generation error:", { message: err }),
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
    [updateGeneration],
  );

  const handleStartSmartExam = useCallback(async () => {
    if (!user || !courseId || !courseName) return;

    // 1. Try Pool
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

    // 2. Generate
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
  }, [user, courseId, courseName, generateAndFetchExam]);

  const resetState = useCallback(() => {
    setSelectedTopic(null);
    setIsQuizActive(false);
    setExistingQuestions([]);
  }, []);

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
