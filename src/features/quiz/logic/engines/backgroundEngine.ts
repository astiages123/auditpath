import * as Repository from '@/features/quiz/services/repositories/quizRepository';
import { QuizFactory } from '../factory/QuizFactory';
import { logger } from '@/utils/logger';

/**
 * Refreshes archived questions in a batch by checking the pool or generating new ones via JIT.
 */
export async function refreshArchivedQuestions(
  items: { questionId: string; status: string }[],
  chunkId: string | null
): Promise<string[]> {
  const needsRefresh = items.some((i) => i.status === 'archived');

  if (!needsRefresh) {
    return items.map((i) => i.questionId);
  }

  const promises = items.map(async (item) => {
    if (item.status === 'archived' && chunkId) {
      try {
        // 1. Try to fetch from Pool
        const pooledQs = await Repository.fetchGeneratedQuestions(
          chunkId,
          'arsiv',
          5
        );

        if (pooledQs.length > 0) {
          // Select a random one from pool
          const randomQ = pooledQs[Math.floor(Math.random() * pooledQs.length)];
          return randomQ.id; // Return new ID
        }

        // 2. Fallback to JIT generation
        const factory = new QuizFactory();
        const newId = await factory.generateArchiveRefresh(
          chunkId,
          item.questionId
        );
        if (newId) {
          return newId; // Return new ID
        }
      } catch (e) {
        logger.error('Archive refresh failed', e as Error);
      }
    }
    return item.questionId; // Fallback to original
  });

  const results = await Promise.all(promises);
  return results;
}

/**
 * Triggers background question generation for a chunk.
 */
export async function checkAndTriggerBackgroundGeneration(
  chunkId: string,
  _incorrectIds: string[]
): Promise<void> {
  const factory = new QuizFactory();
  try {
    await factory.generateForChunk(
      chunkId,
      {
        onTotalTargetCalculated: () => {},
        onLog: () => {},
        onQuestionSaved: () => {},
        onComplete: () => {},
        onError: (err: unknown) =>
          logger.error('Background gen error', {
            error: String(err),
          }),
      },
      {
        usageType: 'antrenman',
        targetCount: 5, // Top up buffer,
      }
    );
  } catch (e) {
    logger.error('Failed to trigger background generation', e as Error);
  }
}
