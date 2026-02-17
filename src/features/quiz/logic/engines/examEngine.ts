import * as Repository from "@/features/quiz/services/repositories/quizRepository";
import { type GeneratorCallbacks, QuizFactory } from "../factory/QuizFactory";
import {
  calculateQuestionWeights,
  type ChunkMetric,
} from "@/features/quiz/logic/algorithms/distribution";
import { parseOrThrow } from "@/utils/helpers";
import { ChunkMetadataSchema } from "@/features/quiz/types/quizSchemas";
import { logger } from "@/utils/logger";

export class ExamService {
  private static async buildExamDistribution(
    courseId: string,
    userId: string,
    examTotal: number,
  ): Promise<{ weights: Map<string, number>; metrics: ChunkMetric[] }> {
    const chunks = await Repository.fetchCourseChunks(courseId);
    const masteryRows = await Repository.fetchCourseMastery(courseId, userId);
    const masteryMap = new Map(
      masteryRows.map((m) => [m.chunk_id, m.mastery_score]),
    );

    const metrics: ChunkMetric[] = chunks.map((c) => ({
      id: c.id,
      concept_count:
        parseOrThrow(ChunkMetadataSchema, c.metadata).concept_map?.length || 5,
      difficulty_index:
        parseOrThrow(ChunkMetadataSchema, c.metadata).difficulty_index || 3,
      mastery_score: masteryMap.get(c.id) || 0,
    }));

    const weights = calculateQuestionWeights({
      examTotal,
      importance: "medium",
      chunks: metrics,
    });

    return { weights, metrics };
  }

  static async generateSmartExam(
    courseId: string,
    courseName: string,
    userId: string,
    callbacks: GeneratorCallbacks,
  ): Promise<{ success: boolean; questionIds: string[] }> {
    const factory = new QuizFactory();
    const EXAM_TOTAL = 20;

    // Report total target immediately for Smart Exam
    callbacks.onTotalTargetCalculated(EXAM_TOTAL);

    try {
      // 1. Fetch data & calculate distribution
      callbacks.onLog({
        id: crypto.randomUUID(),
        step: "INIT",
        message: "Ders verileri analiz ediliyor...",
        details: {},
        timestamp: new Date(),
      });

      const { weights } = await this.buildExamDistribution(
        courseId,
        userId,
        EXAM_TOTAL,
      );

      const questionIds: string[] = [];
      let totalSaved = 0;

      // 3. Process each chunk
      for (const [chunkId, count] of weights.entries()) {
        if (count <= 0) continue;

        const existingDeneme = await Repository.fetchGeneratedQuestions(
          chunkId,
          "deneme",
          count,
        );

        if (existingDeneme.length < count) {
          callbacks.onLog({
            id: crypto.randomUUID(),
            step: "GENERATING",
            message: `Eksik sorular havuzdan tamamlanıyor: ${chunkId}`,
            details: {
              target: count,
              existing: existingDeneme.length,
            },
            timestamp: new Date(),
          });

          await factory.generateForChunk(
            chunkId,
            {
              onLog: callbacks.onLog,
              onTotalTargetCalculated: () => {}, // Handled globally by the exam
              onQuestionSaved: () => {
                totalSaved++;
                callbacks.onQuestionSaved(totalSaved);
              },
              onComplete: () => {}, // Pipeline completion not needed here
              onError: (err: string) => {
                throw new Error(err);
              },
            },
            {
              usageType: "deneme",
              targetCount: count - existingDeneme.length,
            },
          );
        }

        // Final fetch after potential generation
        const finalQs = await Repository.fetchGeneratedQuestions(
          chunkId,
          "deneme",
          count,
        );
        finalQs.forEach((q) => questionIds.push(q.id));
      }

      callbacks.onComplete({ success: true, generated: totalSaved });
      return {
        success: true,
        questionIds: questionIds.slice(0, EXAM_TOTAL),
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      callbacks.onError(errorMsg);
      return { success: false, questionIds: [] };
    }
  }

  static async fetchSmartExamFromPool(
    courseId: string,
    userId: string,
  ): Promise<{ success: boolean; questionIds: string[] } | null> {
    const EXAM_TOTAL = 20;

    try {
      const { weights } = await this.buildExamDistribution(
        courseId,
        userId,
        EXAM_TOTAL,
      );

      const questionIds: string[] = [];
      for (const [chunkId, count] of weights.entries()) {
        if (count <= 0) continue;

        const existingDeneme = await Repository.fetchGeneratedQuestions(
          chunkId,
          "deneme",
          count,
        );

        if (existingDeneme.length < count) {
          // Pool insufficient for SAK balance
          return null;
        }
        existingDeneme.forEach((q) => questionIds.push(q.id));
      }

      return {
        success: true,
        questionIds: questionIds.slice(0, EXAM_TOTAL),
      };
    } catch (error) {
      logger.error("Pool fetch error:", error as Error);
      return null;
    }
  }
}
