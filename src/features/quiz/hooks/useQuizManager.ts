import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  type GenerationLog,
  type QuizQuestion,
  QuizQuestionSchema,
} from '@/features/quiz/types';
import {
  TopicCompletionStats,
  TopicWithCounts,
} from '@/features/courses/types/courseTypes';
import { logger } from '@/utils/logger';
import { parseOrThrow } from '@/utils/validation';
import { useQuizTopics } from './useQuizTopics';
import { useQuizGeneration } from './useQuizGeneration';
import { useQuizPersistence } from './useQuizPersistence';
import { getTopicCompletionStatus } from '@/features/quiz/services/quizStatusService';
import { getFirstChunkIdForTopic } from '@/features/quiz/services/quizCoreService';
import {
  fetchGeneratedQuestions,
  fetchQuestionsByIds,
  generateSmartExam,
} from '@/features/quiz/services/quizQuestionService';
import { generateForChunk } from '@/features/quiz/logic/quizParser';

// ============================================================================
// CONSTANTS
// ============================================================================

export const QUIZ_PHASE = {
  /** Analiz edilmemiş / Başlatılmamış */
  NOT_ANALYZED: 'NOT_ANALYZED',
  /** Ünite analizi / Soru üretimi devam ediyor */
  MAPPING: 'MAPPING',
  /** Sınav öncesi bilgilendirme ekranı */
  BRIEFING: 'BRIEFING',
  /** Sınav aktif olarak çözülüyor */
  ACTIVE: 'ACTIVE',
} as const;

// ============================================================================
// TYPES
// ============================================================================

export type QuizPhase = (typeof QUIZ_PHASE)[keyof typeof QUIZ_PHASE];

export interface GenerationState {
  /** Üretim devam ediyor mu? */
  isGenerating: boolean;
  /** Teknik kayıtlar */
  logs: GenerationLog[];
  /** İlerleme bilgisi */
  progress: { current: number; total: number };
}

interface UseQuizManagerProps {
  /** Drawer/Modal açık mı? */
  isOpen: boolean;
  /** Ders ID'si */
  courseId: string;
  /** Ders adı */
  courseName: string;
}

export interface UseQuizManagerReturn {
  /** Mevcut kullanıcı */
  user: ReturnType<typeof useAuth>['user'];
  /** Mevcut konular listesi */
  topics: TopicWithCounts[];
  /** Seçili konu */
  selectedTopic: TopicWithCounts | null;
  /** Konu seçimini günceller */
  setSelectedTopic: (topic: TopicWithCounts | null) => void;
  /** Hedef ünite ID'si */
  targetChunkId: string | null;
  /** Yüklenme durumu */
  loading: boolean;
  /** Konu tamamlama istatistikleri */
  completionStatus: TopicCompletionStats | null;
  /** Mevcut/Üretilen sorular */
  existingQuestions: QuizQuestion[];
  /** Sınav aktif mi? */
  isQuizActive: boolean;
  /** Sınav üretiliyor mu? */
  isGeneratingExam: boolean;
  /** Mevcut quiz evresi */
  quizPhase: QuizPhase;
  /** Sınav üretim logları */
  examLogs: GenerationLog[];
  /** Sınav üretim ilerlemesi */
  examProgress: GenerationState['progress'];
  /** Ders genel ilerlemesi */
  courseProgress: { total: number; solved: number; percentage: number } | null;
  /** Quizi başlatır */
  handleStartQuiz: () => void;
  /** Soru üretimini başlatır */
  handleGenerate: (mappingOnly?: boolean) => Promise<void>;
  /** Konu listesine geri döner */
  handleBackToTopics: () => void;
  /** Quizi bitirir */
  handleFinishQuiz: () => Promise<void>;
  /** Akıllı karma sınavı başlatır */
  handleStartSmartExam: () => Promise<void>;
  /** Durumu sıfırlar */
  resetState: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Quiz yönetim sürecini (konu seçimi, üretim, evre yönetimi) koordine eden hook.
 *
 * @param {UseQuizManagerProps} props - Hook parametreleri
 * @returns {UseQuizManagerReturn} Yönetim durumu ve aksiyonları
 */
export function useQuizManager({
  isOpen,
  courseId,
  courseName,
}: UseQuizManagerProps): UseQuizManagerReturn {
  // === EXTERNAL HOOKS ===
  const { user } = useAuth();
  const {
    topics,
    loading: topicsLoading,
    courseProgress,
    refreshTopics,
  } = useQuizTopics({
    isOpen,
    courseId,
    userId: user?.id,
  });

  const { generation, startGeneration, resetGeneration } = useQuizGeneration();

  const { saveManager, loadManager } = useQuizPersistence(courseId);

  // === STATE ===

  const [selectedTopic, setSelectedTopic] = useState<TopicWithCounts | null>(
    () => {
      const persisted = loadManager();
      return persisted?.selectedTopic || null;
    }
  );

  const [targetChunkId, setTargetChunkId] = useState<string | null>(null);
  const [completionStatus, setCompletionStatus] =
    useState<TopicCompletionStats | null>(null);
  const [existingQuestions, setExistingQuestions] = useState<QuizQuestion[]>(
    []
  );
  const [isQuizActive, setIsQuizActive] = useState<boolean>(() => {
    const persisted = loadManager();
    return persisted?.isQuizActive || false;
  });

  // === CALCULATIONS ===

  /** Mevcut quiz evresini hesaplar */
  const quizPhase = (() => {
    if (isQuizActive) return QUIZ_PHASE.ACTIVE;
    if (generation.isGenerating) return QUIZ_PHASE.MAPPING;
    if (completionStatus?.aiLogic && completionStatus?.concepts?.length) {
      return QUIZ_PHASE.BRIEFING;
    }
    return QUIZ_PHASE.NOT_ANALYZED;
  })();

  const isGeneratingExam = generation.isGenerating;

  // === HELPERS ===

  /** Veritabanı havuzundan deneme sınavı çekmeye çalışır */
  const startExamFromPool = useCallback(
    async (_userId: string, courseIdParam: string) => {
      try {
        const poolResult = await fetchGeneratedQuestions(
          courseIdParam,
          'deneme',
          20
        );
        if (poolResult && poolResult.length >= 20) {
          return poolResult.map((q) => ({
            ...(parseOrThrow(QuizQuestionSchema, q.question_data) as object),
            id: q.id,
          })) as QuizQuestion[];
        }
      } catch (error) {
        console.error('[useQuizManager][startExamFromPool] Hata:', error);
        logger.error(
          'QuizManager',
          'startExamFromPool',
          'Havuzdan sınav çekilemedi:',
          error as Error
        );
      }
      return null;
    },
    []
  );

  /** Tamamen yeni bir karma antrenman sınavı üretir */
  const generateAndFetchExam = useCallback(async () => {
    if (!user) return null;
    try {
      const result = await generateSmartExam(courseId, user.id);
      if (result.success && result.questionIds.length > 0) {
        const questionsData = await fetchQuestionsByIds(result.questionIds);
        if (questionsData) {
          return questionsData.map((q) => ({
            ...(parseOrThrow(QuizQuestionSchema, q.question_data) as object),
            id: q.id,
          })) as QuizQuestion[];
        }
      }
    } catch (error) {
      console.error('[useQuizManager][generateAndFetchExam] Hata:', error);
      logger.error(
        'QuizManager',
        'generateAndFetchExam',
        'Akıllı sınav üretilemedi:',
        error as Error
      );
    }
    return null;
  }, [user, courseId]);

  // === ACTIONS ===

  /** Konu için soru üretimini başlatır */
  const handleGenerate = useCallback(
    async (_mappingOnly = true) => {
      if (!targetChunkId) return;
      try {
        await startGeneration(
          targetChunkId,
          async () => {
            if (selectedTopic && user) {
              const newStatus = await getTopicCompletionStatus(
                user.id,
                courseId,
                selectedTopic.name
              );
              setCompletionStatus(newStatus);
            }
          },
          user?.id
        );
      } catch (err) {
        console.error('[useQuizManager][handleGenerate] Hata:', err);
      }
    },
    [targetChunkId, user, selectedTopic, courseId, startGeneration]
  );

  /** Quiz oturumunu başlatır */
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

  /** Konu listesine geri döner */
  const handleBackToTopics = useCallback(() => {
    setSelectedTopic(null);
    setIsQuizActive(false);
    resetGeneration();
    setExistingQuestions([]);
    refreshTopics();
  }, [resetGeneration, refreshTopics]);

  /** Quiz oturumunu bitirir ve arka plan üretimlerini (Deneme soruları vb.) tetikler */
  const handleFinishQuiz = useCallback(async () => {
    setIsQuizActive(false);
    setExistingQuestions([]);

    if (selectedTopic && user && courseId) {
      try {
        const status = await getTopicCompletionStatus(
          user.id,
          courseId,
          selectedTopic.name
        );
        setCompletionStatus(status);

        if (targetChunkId) {
          const needsDeneme = status.deneme.existing < status.deneme.quota;

          if (needsDeneme) {
            logger.info(
              'QuizManager',
              'handleFinishQuiz',
              'Deneme soruları için arka plan üretimi tetikleniyor.',
              {
                topic: selectedTopic.name,
              }
            );

            generateForChunk(
              targetChunkId,
              {
                onLog: () => {},
                onTotalTargetCalculated: () => {},
                onQuestionSaved: () => {},
                onComplete: async () => {
                  const finalStatus = await getTopicCompletionStatus(
                    user.id,
                    courseId,
                    selectedTopic.name
                  );
                  setCompletionStatus(finalStatus);
                },
                onError: (err) => {
                  console.error(
                    '[useQuizManager][handleFinishQuiz][generateForChunk] Hata:',
                    err
                  );
                  logger.error(
                    'QuizManager',
                    'handleFinishQuiz',
                    'Arka plan üretim hatası:',
                    { message: err }
                  );
                },
              },
              { usageType: 'deneme', userId: user.id }
            );
          }
        }
      } catch (err) {
        console.error('[useQuizManager][handleFinishQuiz] Hata:', err);
      }
    }
  }, [selectedTopic, user, courseId, targetChunkId]);

  /** Karışık/Akıllı sınav oturumunu başlatır */
  const handleStartSmartExam = useCallback(async () => {
    if (!user || !courseId || !courseName) return;
    try {
      const pooledQuestions = await startExamFromPool(user.id, courseId);
      if (pooledQuestions) {
        setExistingQuestions(pooledQuestions);
        setSelectedTopic({
          name: 'Karma Deneme Sınavı',
          isCompleted: false,
          counts: {
            antrenman: 0,
            deneme: pooledQuestions.length,
            total: pooledQuestions.length,
          },
        });
        setIsQuizActive(true);
        return;
      }
      const generatedQuestions = await generateAndFetchExam();
      if (generatedQuestions) {
        setExistingQuestions(generatedQuestions);
        setSelectedTopic({
          name: 'Karma Deneme Sınavı',
          isCompleted: false,
          counts: {
            antrenman: 0,
            deneme: generatedQuestions.length,
            total: generatedQuestions.length,
          },
        });
        setIsQuizActive(true);
      }
    } catch (err) {
      console.error('[useQuizManager][handleStartSmartExam] Hata:', err);
    }
  }, [user, courseId, courseName, startExamFromPool, generateAndFetchExam]);

  /** Durumu tamamen sıfırlar */
  const resetState = useCallback(() => {
    setSelectedTopic(null);
    setIsQuizActive(false);
    setExistingQuestions([]);
  }, []);

  // === SIDE EFFECTS ===

  /** Seçili konu değiştiğinde veya oturum açıldığında verileri yükler */
  useEffect(() => {
    let mounted = true;

    async function loadTopicData() {
      if (!selectedTopic || !courseId || !user) {
        setTargetChunkId(null);
        setCompletionStatus(null);
        return;
      }
      try {
        const chunkRes = await getFirstChunkIdForTopic(
          courseId,
          selectedTopic.name
        );
        const status = await getTopicCompletionStatus(
          user.id,
          courseId,
          selectedTopic.name
        );
        if (mounted) {
          setTargetChunkId(chunkRes);
          setCompletionStatus(status);
        }
      } catch (error) {
        if (mounted) {
          console.error('[useQuizManager][loadTopicData] Hata:', error);
          logger.error(
            'QuizManager',
            'loadTopicData',
            'Konu verileri yüklenemedi:',
            error as Error
          );
        }
      }
    }

    loadTopicData();

    return () => {
      mounted = false;
    };
  }, [selectedTopic, courseId, user]);

  /** Değişiklikleri yerel depolamaya kaydeder */
  useEffect(() => {
    if (selectedTopic) {
      saveManager(selectedTopic, quizPhase, isQuizActive);
    }
  }, [selectedTopic, quizPhase, isQuizActive, saveManager]);

  // === RETURN ===

  return {
    user,
    topics,
    selectedTopic,
    setSelectedTopic,
    targetChunkId,
    loading: topicsLoading,
    completionStatus,
    existingQuestions,
    isQuizActive,
    isGeneratingExam,
    quizPhase,
    examLogs: generation.logs,
    examProgress: generation.progress,
    courseProgress,
    handleStartQuiz,
    handleGenerate,
    handleBackToTopics,
    handleFinishQuiz,
    handleStartSmartExam,
    resetState,
  };
}
